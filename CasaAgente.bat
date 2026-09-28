@echo off
rem ============================================================
rem  CasaAgente.bat - agente della casa digitale
rem  Pubblica lo stato dei dispositivi su GitHub, esegue i
rem  comandi che arrivano dalla pagina e le automazioni.
rem  Al primo avvio chiede il token e crea token.txt da solo.
rem ============================================================
setlocal
set "CASA_DIR=%~dp0"
title Casa - agente
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0'); $m='#PS'+'_START#'; $i=$t.IndexOf($m); Invoke-Expression $t.Substring($i+$m.Length)"
echo.
pause
exit /b %errorlevel%

#PS_START#

# rete di sicurezza: qualunque errore resta a schermo invece di far sparire la finestra
trap {
    Write-Host ''
    Write-Host '  ERRORE' -ForegroundColor Red
    Write-Host ('  ' + $_.Exception.Message) -ForegroundColor Red
    if ($_.InvocationInfo) {
        Write-Host ('  riga ' + $_.InvocationInfo.ScriptLineNumber + ': ' + $_.InvocationInfo.Line.Trim()) -ForegroundColor DarkYellow
    }
    Write-Host ''
    Read-Host '  Premi INVIO per chiudere'
    exit 1
}

# ================== CONFIGURAZIONE ==================
$Config = @{
    Owner          = 'Liukrende98'
    Repo           = 'Prove'
    Branch         = 'main'
    Cartella       = 'casa'       # cartella del progetto dentro il repo
    Porta          = 8099         # porta del server locale (risposta istantanea)
    Etichetta      = 'casa'       # identifica questo agente: stampa solo i lavori destinati a lui
    ChiaveAccesso  = 'moreno'           # se valorizzata, ogni comando deve presentarla: obbligatoria se esponi l'agente su internet
    TentativiMax   = 5            # tentativi sbagliati prima del blocco
    BloccoMinuti   = 30           # per quanto resta bloccato chi sbaglia troppe volte
    Stampante      = ''           # OBBLIGATORIA: nome esatto della stampante di casa. Vuoto = non stampa nulla
    SumatraPath    = 'C:\Program Files\SumatraPDF\SumatraPDF.exe'
    RetiExtra      = @('192.168.1', '192.168.10')   # reti da scansionare sempre, anche se il PC non ci sta dentro
    IntervalloSec  = 8            # ogni quanto legge i comandi
    StatoOgniSec   = 20           # ogni quanto ricontrolla i dispositivi
    PubblicaOgniSec= 180          # pubblica comunque, anche se nulla e' cambiato
    PorteDaSondare = @(80, 443, 8080, 554, 9100, 445, 8009)
}
# ====================================================

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$BaseDir   = $env:CASA_DIR; if (-not $BaseDir) { $BaseDir = (Get-Location).Path }
$TokenPath = Join-Path $BaseDir 'token.txt'
$FileRete  = Join-Path $BaseDir 'rete.json'
$LogPath   = Join-Path $BaseDir 'casa.log'
$Utf8      = New-Object System.Text.UTF8Encoding($false)
$Api       = "https://api.github.com/repos/$($Config.Owner)/$($Config.Repo)"
$C         = $Config.Cartella

$script:Dispositivi   = @()
$script:Dati          = $null
$script:Eseguite      = @{}
$script:UltimoMinuto  = ''
$script:UltimoStato   = [DateTime]::MinValue
$script:UltimaPubbl   = [DateTime]::MinValue
$script:UltimaImpronta= ''

function Log($t, $c = 'Gray') {
    $r = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $t
    Write-Host $r -ForegroundColor $c
    try { Add-Content -LiteralPath $LogPath -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $t) -Encoding UTF8 } catch { }
}

# ---------- token ----------
if (Test-Path $TokenPath) {
    $Token = (Get-Content -LiteralPath $TokenPath -Raw).Trim()
} else {
    Write-Host ''
    Write-Host '  Primo avvio: incolla il token GitHub e premi INVIO.' -ForegroundColor Yellow
    Write-Host ''
    $Token = (Read-Host '  Token').Trim()
    if (-not $Token) { Log 'Nessun token inserito.' 'Red'; Start-Sleep 3; exit 1 }
    [IO.File]::WriteAllText($TokenPath, $Token, $Utf8)
}

function Intestazioni($accept = 'application/vnd.github+json') {
    @{ 'Authorization' = "Bearer $Token"; 'Accept' = $accept
       'User-Agent' = 'CasaAgente'; 'X-GitHub-Api-Version' = '2022-11-28' }
}

function Gh-Info($percorso) {
    try { Invoke-RestMethod -Uri "$Api/contents/$($percorso)?ref=$($Config.Branch)" -Headers (Intestazioni) -Method Get }
    catch { if ($_.Exception.Response.StatusCode.value__ -eq 404) { return $null }; throw }
}
function Gh-Testo($percorso) {
    $r = Invoke-WebRequest -Uri "$Api/contents/$($percorso)?ref=$($Config.Branch)" -Headers (Intestazioni 'application/vnd.github.raw') -UseBasicParsing
    if ($r.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($r.Content) } else { $r.Content }
}
function Gh-Scrivi($percorso, $testo, $messaggio) {
    $e = Gh-Info $percorso
    $b = @{ message = $messaggio; branch = $Config.Branch
            content = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($testo)) }
    if ($e) { $b.sha = $e.sha }
    Invoke-RestMethod -Uri "$Api/contents/$percorso" -Headers (Intestazioni) -Method Put -Body ($b | ConvertTo-Json -Depth 4) -ContentType 'application/json' | Out-Null
}
function Gh-Elimina($percorso, $sha, $messaggio) {
    if (-not $sha) { $e = Gh-Info $percorso; if (-not $e) { return }; $sha = $e.sha }
    $b = @{ message = $messaggio; sha = $sha; branch = $Config.Branch }
    Invoke-RestMethod -Uri "$Api/contents/$percorso" -Headers (Intestazioni) -Method Delete -Body ($b | ConvertTo-Json) -ContentType 'application/json' | Out-Null
}

# ---------- rete ----------
function Sottoreti {
    $indirizzi = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and
            $_.InterfaceAlias -notmatch 'Loopback|vEthernet|VMware|VirtualBox|Hyper-V|Bluetooth|TAP|VPN'
        }
    $basi = @()
    foreach ($b in $Config.RetiExtra) {
        if ($b -and $basi -notcontains $b) { $basi += $b; Log "  rete configurata: $b.0/24" 'DarkGray' }
    }
    foreach ($a in $indirizzi) {
        $b = ($a.IPAddress -split '\.')[0..2] -join '.'
        if ($basi -notcontains $b) {
            $basi += $b
            Log "  rete rilevata: $b.0/24 su $($a.InterfaceAlias)" 'DarkGray'
        }
    }
    return $basi
}

function Attendi-Tutti($compiti, $millisecondi) {
    try { [Threading.Tasks.Task]::WaitAll([Threading.Tasks.Task[]]$compiti, $millisecondi) | Out-Null } catch { }
}

function Vivi($base) {
    $trovati = @{}
    # due passaggi: molti dispositivi a batteria rispondono solo al secondo
    foreach ($passaggio in 1..2) {
        $t = @()
        foreach ($n in 1..254) {
            $p = New-Object Net.NetworkInformation.Ping
            $t += [pscustomobject]@{ Ip = "$base.$n"; T = $p.SendPingAsync("$base.$n", 2500) }
        }
        Attendi-Tutti ($t | ForEach-Object { $_.T }) 9000
        foreach ($x in $t) {
            if ($x.T.Status -eq 'RanToCompletion' -and $x.T.Result.Status -eq 'Success') { $trovati[$x.Ip] = $true }
        }
    }
    # chi ignora il ping ma ha risposto all'ARP e' comunque presente
    foreach ($r in (arp -a)) {
        if ($r -match "($([regex]::Escape($base))\.\d+)\s+([0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2})\s+(dinamico|dynamic)") {
            if ($matches[2] -notmatch '^(ff-ff|01-00-5e|33-33)') { $trovati[$matches[1]] = $true }
        }
    }
    @($trovati.Keys | Sort-Object { [int](($_ -split '\.')[3]) })
}

function Stato-Shelly($ip) {
    try {
        $j = Invoke-RestMethod -Uri "http://$ip/rpc/Shelly.GetStatus" -TimeoutSec 5
        foreach ($k in 'switch:0','light:0','cover:0') {
            if ($j.$k) { return @{ acceso = [bool]$j.$k.output; watt = $j.$k.apower } }
        }
    } catch { }
    try {
        $j = Invoke-RestMethod -Uri "http://$ip/status" -TimeoutSec 5
        if ($j.relays) { return @{ acceso = [bool]$j.relays[0].ison; watt = $(if ($j.meters) { $j.meters[0].power }) } }
    } catch { }
    return $null
}

function Risponde-TCP($ip, $porte) {
    $elenco = @($porte)
    if ($elenco.Count -eq 0) { $elenco = @(80) }
    foreach ($p in $elenco) {
        $c = New-Object Net.Sockets.TcpClient
        try { $ok = $c.ConnectAsync($ip, $p).Wait(1200) } catch { $ok = $false }
        $c.Close()
        if ($ok) { return $true }
    }
    return $false
}

function Scansiona {
    $basi = Sottoreti
    if (-not $basi -or $basi.Count -eq 0) { Log 'Nessuna rete rilevata' 'Red'; return @() }
    Log "Scansione in corso su $($basi.Count) rete/i..." 'Cyan'
    $vivi = @()
    foreach ($b in $basi) {
        $trovati = Vivi $b
        Log "  $b.0/24 -> $($trovati.Count) dispositivi" 'DarkGray'
        $vivi += $trovati
    }
    $vivi = @($vivi | Select-Object -Unique)

    $mac = @{}
    foreach ($r in (arp -a)) {
        if ($r -match '(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2}[-:][0-9a-f]{2})') {
            $mac[$matches[1]] = $matches[2].ToLower().Replace('-', ':')
        }
    }

    $aperte = @{}; $vivi | ForEach-Object { $aperte[$_] = @() }
    $sonde = @()
    foreach ($ip in $vivi) { foreach ($p in $Config.PorteDaSondare) {
        $c = New-Object Net.Sockets.TcpClient
        $sonde += [pscustomobject]@{ Ip = $ip; P = $p; C = $c; T = $c.ConnectAsync($ip, $p) } } }
    Attendi-Tutti ($sonde | ForEach-Object { $_.T }) 4000
    foreach ($s in $sonde) { if ($s.T.Status -eq 'RanToCompletion') { $aperte[$s.Ip] += $s.P }; $s.C.Close() }

    $nomi = @{}
    $tn = @()
    foreach ($ip in $vivi) { $tn += [pscustomobject]@{ Ip = $ip; T = [Net.Dns]::GetHostEntryAsync($ip) } }
    Attendi-Tutti ($tn | ForEach-Object { $_.T }) 4000
    foreach ($x in $tn) { $nomi[$x.Ip] = $(if ($x.T.Status -eq 'RanToCompletion') { $x.T.Result.HostName } else { '' }) }

    $elenco = @()
    foreach ($ip in $vivi) {
        $sh = $null
        if ($aperte[$ip] -contains 80) { $sh = Stato-Shelly $ip }
        $nome = $nomi[$ip]
        $tipo = 'sconosciuto'
        if     ($sh)                                   { $tipo = 'shelly' }
        elseif ($ip -match '\.1$')                     { $tipo = 'router' }
        elseif ($aperte[$ip] -contains 9100)           { $tipo = 'stampante' }
        elseif ($aperte[$ip] -contains 554)            { $tipo = 'telecamera' }
        elseif ($nome -match 'switchbot|hub|bridge')   { $tipo = 'hub' }
        elseif ($nome -match 'google|nest|echo|sonos') { $tipo = 'altoparlante' }
        elseif ($nome -match 'tado|thermo|termo')      { $tipo = 'termostato' }
        elseif ($nome -match 'repeater|fritz|tp-link') { $tipo = 'router' }
        elseif ($aperte[$ip] -contains 445)            { $tipo = 'computer' }

        $elenco += [ordered]@{
            ip = $ip; mac = $(if ($mac[$ip]) { $mac[$ip] } else { '' }); nomeRete = $nome
            tipo = $tipo; porte = @($aperte[$ip]); online = $true
            acceso = $(if ($sh) { $sh.acceso } else { $null })
            watt = $(if ($sh) { $sh.watt } else { $null })
            comandabile = [bool]$sh
            vistoIl = (Get-Date).ToString('o')
        }
    }
    $script:Dispositivi = $elenco
    [IO.File]::WriteAllText($FileRete, (@{ dispositivi = $elenco } | ConvertTo-Json -Depth 6), $Utf8)
    Log "  trovati $($elenco.Count) dispositivi" 'Green'
    return $elenco
}

function Ricontrolla {
    if (-not $script:Dispositivi -or $script:Dispositivi.Count -eq 0) { return Scansiona }

    # primo tentativo: ping
    $t = @()
    foreach ($d in $script:Dispositivi) {
        $p = New-Object Net.NetworkInformation.Ping
        $t += [pscustomobject]@{ D = $d; T = $p.SendPingAsync($d.ip, 2500) }
    }
    Attendi-Tutti ($t | ForEach-Object { $_.T }) 6000

    $dubbi = @()
    foreach ($x in $t) {
        $vivo = ($x.T.Status -eq 'RanToCompletion' -and $x.T.Result.Status -eq 'Success')
        if ($vivo) { $x.D.online = $true } else { $dubbi += $x.D }
    }

    # secondo tentativo: chi ignora il ping puo' rispondere lo stesso sulle sue porte
    foreach ($d in $dubbi) {
        $d.online = Risponde-TCP $d.ip $d.porte
    }

    # gli Shelly li interrogo comunque: se rispondono sono vivi, qualunque cosa dica il ping
    foreach ($d in $script:Dispositivi) {
        if ($d.tipo -eq 'shelly' -or $d.comandabile) {
            $sh = Stato-Shelly $d.ip
            if ($sh) { $d.online = $true; $d.acceso = $sh.acceso; $d.watt = $sh.watt }
            elseif (-not $d.online) { $d.acceso = $null }
        } elseif (-not $d.online) {
            $d.acceso = $null
        }
        $d.vistoIl = (Get-Date).ToString('o')
    }
    return $script:Dispositivi
}

function Pubblica-Stato($forza = $false) {
    $doc = [ordered]@{
        aggiornatoIl = (Get-Date).ToString('o')
        postazione   = $env:COMPUTERNAME
        dispositivi  = $script:Dispositivi
    }
    $impronta = ($script:Dispositivi | ForEach-Object { "$($_.ip)|$($_.online)|$($_.acceso)" }) -join ';'
    $scaduto = ((Get-Date) - $script:UltimaPubbl).TotalSeconds -ge $Config.PubblicaOgniSec
    if (-not $forza -and $impronta -eq $script:UltimaImpronta -and -not $scaduto) { return }
    Gh-Scrivi "$C/stato.json" ($doc | ConvertTo-Json -Depth 6) 'stato casa'
    $script:UltimaImpronta = $impronta
    $script:UltimaPubbl = Get-Date
    Log 'stato pubblicato'
}

# ---------- comandi ----------
function Comanda($ip, $acceso) {
    $v = $(if ($acceso) { 'true' } else { 'false' })
    try { Invoke-RestMethod -Uri "http://$ip/rpc/Switch.Set?id=0&on=$v" -TimeoutSec 6 | Out-Null; return $true } catch { }
    $t = $(if ($acceso) { 'on' } else { 'off' })
    try { Invoke-RestMethod -Uri "http://$ip/relay/0?turn=$t" -TimeoutSec 6 | Out-Null; return $true } catch { }
    return $false
}

function Leggi-Dati {
    try { $script:Dati = (Gh-Testo "$C/dati.json") | ConvertFrom-Json } catch { }
    return $script:Dati
}

function Esegui-Automazione($a) {
    Log "automazione: $($a.nome)" 'Magenta'
    foreach ($az in $a.azioni) {
        if ($az.tipo -eq 'attendi') {
            Log "   pausa di $($az.secondi) s"
            Start-Sleep -Seconds ([int]$az.secondi)
        } else {
            $on = ($az.tipo -eq 'accendi')
            $ok = Comanda $az.ip $on
            $d = $script:Dispositivi | Where-Object { $_.ip -eq $az.ip }
            if ($ok -and $d) { $d.acceso = $on }
            Log ("   {0} {1}: {2}" -f $az.tipo, $az.ip, $(if ($ok) { 'ok' } else { 'fallito' })) $(if ($ok) { 'Green' } else { 'Red' })
        }
    }
    Pubblica-Stato $true
}

function Processa-Comandi {
    $elenco = Gh-Info "$C/comandi"
    if (-not $elenco) { return }
    foreach ($v in @($elenco | Where-Object { $_.type -eq 'file' -and $_.name -like '*.json' } | Sort-Object name)) {
        $cmd = $null
        try { $cmd = (Gh-Testo $v.path) | ConvertFrom-Json } catch { }
        if ($cmd) {
            switch ($cmd.tipo) {
                'accendi'  { $ok = Comanda $cmd.ip $true
                             $d = $script:Dispositivi | Where-Object { $_.ip -eq $cmd.ip }; if ($ok -and $d) { $d.acceso = $true }
                             Log "comando: accendi $($cmd.ip) -> $(if($ok){'ok'}else{'fallito'})" $(if ($ok) { 'Green' } else { 'Red' }) }
                'spegni'   { $ok = Comanda $cmd.ip $false
                             $d = $script:Dispositivi | Where-Object { $_.ip -eq $cmd.ip }; if ($ok -and $d) { $d.acceso = $false }
                             Log "comando: spegni $($cmd.ip) -> $(if($ok){'ok'}else{'fallito'})" $(if ($ok) { 'Green' } else { 'Red' }) }
                'scansione'{ Scansiona | Out-Null }
                'stato'    { Ricontrolla | Out-Null }
                'automazione' {
                    $dati = Leggi-Dati
                    $a = $null
                    if ($dati.automazioni) { $a = $dati.automazioni | Where-Object { $_.id -eq $cmd.id } }
                    if ($a) { Esegui-Automazione $a } else { Log "automazione $($cmd.id) non trovata" 'Red' }
                }
            }
        }
        Gh-Elimina $v.path $v.sha 'comando eseguito'
        Pubblica-Stato $true
    }
}

function Controlla-Automazioni {
    $adesso = Get-Date
    $minuto = $adesso.ToString('yyyy-MM-dd HH:mm')
    if ($script:UltimoMinuto -eq $minuto) { return }
    $script:UltimoMinuto = $minuto
    $dati = Leggi-Dati
    if (-not $dati -or -not $dati.automazioni) { return }
    $oggi = [int]$adesso.DayOfWeek
    $ora  = $adesso.ToString('HH:mm')
    foreach ($a in $dati.automazioni) {
        if (-not $a.attiva) { continue }
        if ($a.ora -ne $ora) { continue }
        if ($a.giorni -and @($a.giorni).Count -gt 0 -and (@($a.giorni) -notcontains $oggi)) { continue }
        if ($script:Eseguite[$a.id] -eq $minuto) { continue }
        $script:Eseguite[$a.id] = $minuto
        Esegui-Automazione $a
    }
}

# ---------- avvio ----------
Clear-Host
Write-Host ''
Write-Host '   CASA DIGITALE - agente' -ForegroundColor Yellow
Write-Host ''
try {
    Invoke-RestMethod -Uri $Api -Headers (Intestazioni) -Method Get | Out-Null
    Log "collegato a $($Config.Owner)/$($Config.Repo)" 'Green'
} catch {
    Log "collegamento fallito: $($_.Exception.Message)" 'Red'
    Read-Host 'INVIO per uscire'; exit 1
}

if (Test-Path $FileRete) {
    try { $script:Dispositivi = @((Get-Content $FileRete -Raw | ConvertFrom-Json).dispositivi) } catch { }
}
if ($script:Dispositivi.Count -eq 0) { Scansiona | Out-Null } else { Ricontrolla | Out-Null }
Pubblica-Stato $true
# ---------- stampe ----------
$DbStampe   = Join-Path $BaseDir 'database_stampe.txt'
$CartStampe = "$C/stampe"
$TempStampe = Join-Path $env:TEMP 'CasaStampe'
if (-not (Test-Path $TempStampe)) { New-Item -ItemType Directory -Path $TempStampe -Force | Out-Null }
if (-not (Test-Path $DbStampe)) {
    [IO.File]::WriteAllText($DbStampe, (@{ versione = 1; creatoIl = (Get-Date).ToString('o')
        postazione = $env:COMPUTERNAME; stampe = @() } | ConvertTo-Json -Depth 6), $Utf8)
    Log "creato il registro stampe: $DbStampe" 'Green'
}

function Verifica-Stampante($stampante) {
    if (-not $stampante) { $stampante = $Config.Stampante }
    if (-not $stampante) {
        throw "Nessuna stampante configurata su questo agente. Apri il .bat e imposta Stampante = 'nome esatto'."
    }
    $installate = Stampanti
    if ($installate -and ($installate -notcontains $stampante)) {
        throw "La stampante '$stampante' non esiste su $env:COMPUTERNAME. Disponibili: $($installate -join ', ')"
    }
    return $stampante
}

function Stampa-File($file, $copie, $stampante) {
    if (-not $copie -or $copie -lt 1) { $copie = 1 }
    $stampante = Verifica-Stampante $stampante
    $est = [IO.Path]::GetExtension($file).ToLower()

    if ($est -in @('.png','.jpg','.jpeg','.bmp','.gif','.tif','.tiff')) {
        Add-Type -AssemblyName System.Drawing
        $img = [Drawing.Image]::FromFile($file)
        try {
            $doc = New-Object Drawing.Printing.PrintDocument
            $doc.PrinterSettings.PrinterName = $stampante
            if (-not $doc.PrinterSettings.IsValid) { throw "Stampante non valida: $stampante" }
            $doc.PrinterSettings.Copies = $copie
            $doc.DocumentName = [IO.Path]::GetFileName($file)
            $doc.DefaultPageSettings.Landscape = ($img.Width -gt $img.Height)
            $doc.add_PrintPage({
                param($m, $e)
                $area = $e.MarginBounds
                $s = [Math]::Min($area.Width / $img.Width, $area.Height / $img.Height)
                $l = [int]($img.Width * $s); $a = [int]($img.Height * $s)
                $e.Graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $e.Graphics.DrawImage($img, $area.X + [int](($area.Width - $l)/2), $area.Y + [int](($area.Height - $a)/2), $l, $a)
                $e.HasMorePages = $false
            })
            $doc.Print()
        } finally { $img.Dispose() }
        return
    }

    if ($est -eq '.pdf') {
        if (-not (Test-Path $Config.SumatraPath)) { throw 'Per i PDF serve SumatraPDF (sumatrapdfreader.org)' }
        $arg = @()
        $arg += @('-print-to', $stampante)
        $arg += @('-silent','-exit-when-done','-print-settings', ("{0}x" -f $copie), $file)
        $p = Start-Process -FilePath $Config.SumatraPath -ArgumentList $arg -PassThru -Wait
        if ($p.ExitCode -ne 0) { throw "SumatraPDF ha restituito $($p.ExitCode)" }
        return
    }

    if ($est -in @('.txt','.xml','.csv','.log','.json','.ini','.md','.sql','.htm','.html')) {
        Add-Type -AssemblyName System.Drawing
        $font = New-Object Drawing.Font('Consolas', 9)
        for ($c = 0; $c -lt $copie; $c++) {
            $righe = New-Object Collections.Generic.List[string]
            foreach ($r in [IO.File]::ReadAllLines($file)) {
                if ($r.Length -le 110) { $righe.Add($r) }
                else { for ($i = 0; $i -lt $r.Length; $i += 110) { $righe.Add($r.Substring($i, [Math]::Min(110, $r.Length - $i))) } }
            }
            $indice = 0
            $doc = New-Object Drawing.Printing.PrintDocument
            $doc.PrinterSettings.PrinterName = $stampante
            if (-not $doc.PrinterSettings.IsValid) { throw "Stampante non valida: $stampante" }
            $doc.DocumentName = [IO.Path]::GetFileName($file)
            $doc.add_PrintPage({
                param($m, $e)
                $area = $e.MarginBounds
                $h = $font.GetHeight($e.Graphics)
                $perPagina = [int]($area.Height / $h)
                $y = $area.Y; $n = 0
                while ($n -lt $perPagina -and $indice -lt $righe.Count) {
                    $e.Graphics.DrawString($righe[$indice], $font, [Drawing.Brushes]::Black, $area.X, $y)
                    $y += $h; $n++; $indice++
                }
                $e.HasMorePages = ($indice -lt $righe.Count)
            }.GetNewClosure())
            $doc.Print()
        }
        return
    }

    for ($i = 0; $i -lt $copie; $i++) {
        Start-Process -FilePath $file -Verb PrintTo -ArgumentList "`"$stampante`"" | Out-Null
        Start-Sleep -Seconds 8
    }
}

function Registra-Stampa($record) {
    try {
        $db = Get-Content -LiteralPath $DbStampe -Raw | ConvertFrom-Json
        $nuovo = [ordered]@{ versione = $db.versione; creatoIl = $db.creatoIl
                             postazione = $db.postazione; stampe = @(@($db.stampe) + $record) }
        [IO.File]::WriteAllText($DbStampe, ($nuovo | ConvertTo-Json -Depth 8), $Utf8)
    } catch { }
    try { Gh-Scrivi "$CartStampe/storico/$($record.id).json" ($record | ConvertTo-Json -Depth 6) "stampa $($record.id)" } catch { }
}

function Ultime-Stampe($quante = 20) {
    try {
        $db = Get-Content -LiteralPath $DbStampe -Raw | ConvertFrom-Json
        $e = @($db.stampe)
        if ($e.Count -gt $quante) { $e = $e[($e.Count - $quante)..($e.Count - 1)] }
        return @($e | Sort-Object elaboratoIl -Descending)
    } catch { return @() }
}

function Esegui-Stampa($lavoro, $percorsoLocale) {
    $esito = 'stampato'; $messaggio = ''
    try {
        Stampa-File $percorsoLocale $lavoro.copie $lavoro.stampante
        Log "stampato $($lavoro.nomeFile) - $($lavoro.utente)" 'Green'
    } catch {
        $esito = 'errore'; $messaggio = $_.Exception.Message
        Log "errore stampa $($lavoro.nomeFile): $messaggio" 'Red'
    }
    Registra-Stampa ([ordered]@{
        id = $lavoro.id; utente = $lavoro.utente; nomeFile = $lavoro.nomeFile
        copie = $lavoro.copie; stampante = $lavoro.stampante; note = $lavoro.note
        creatoIl = $lavoro.creatoIl; elaboratoIl = (Get-Date).ToString('o')
        stato = $esito; messaggio = $messaggio; postazione = $env:COMPUTERNAME })
    Remove-Item -LiteralPath $percorsoLocale -Force -ErrorAction SilentlyContinue
    return $esito
}

function Processa-Stampe {
    $elenco = Gh-Info "$CartStampe/coda"
    if (-not $elenco) { return }
    foreach ($v in @($elenco | Where-Object { $_.type -eq 'file' -and $_.name -like '*.json' } | Sort-Object name)) {
        try {
            $lavoro = (Gh-Testo $v.path) | ConvertFrom-Json
            # sicurezza: se il lavoro e' destinato a un'altra postazione, lo lascio stare
            if ($lavoro.destinazione -and $lavoro.destinazione -ne $Config.Etichetta) {
                Log "salto $($lavoro.nomeFile): destinato a '$($lavoro.destinazione)'" 'DarkGray'
                continue
            }
            $locale = Join-Path $TempStampe $lavoro.nomeFile
            Invoke-WebRequest -Uri "$Api/contents/$($lavoro.percorsoFile)?ref=$($Config.Branch)" -Headers (Intestazioni 'application/vnd.github.raw') -OutFile $locale -UseBasicParsing | Out-Null
            Esegui-Stampa $lavoro $locale | Out-Null
            try { Gh-Elimina $lavoro.percorsoFile $null 'file stampato' } catch { }
        } catch {
            Log "stampa non elaborata: $($_.Exception.Message)" 'Red'
        }
        Gh-Elimina $v.path $v.sha 'coda stampe: completato'
    }
}

function Stampanti {
    try { @(Get-Printer | Where-Object { $_.Name -notmatch 'OneNote|Fax|XPS|PDF' } | Select-Object -ExpandProperty Name) }
    catch { @() }
}

Write-Host ''
if (-not $Config.Stampante) {
    Log 'ATTENZIONE: nessuna stampante configurata, le stampe verranno rifiutate.' 'Red'
    Log ("Stampanti su questo PC: " + ((Stampanti) -join ' | ')) 'Yellow'
    Log "Apri il .bat e scrivi il nome esatto nella riga  Stampante = '...'" 'Yellow'
} elseif ((Stampanti) -notcontains $Config.Stampante) {
    Log "ATTENZIONE: '$($Config.Stampante)' non esiste su $env:COMPUTERNAME." 'Red'
    Log ("Stampanti disponibili: " + ((Stampanti) -join ' | ')) 'Yellow'
} else {
    Log "stampe dirette su: $($Config.Stampante)" 'Green'
}
Log "etichetta di questo agente: $($Config.Etichetta)" 'DarkGray'
if ($Config.ChiaveAccesso) { Log 'chiave di accesso attiva' 'Green' }
else { Log 'nessuna chiave di accesso: non esporre questo agente su internet' 'DarkYellow' }
Write-Host ''
Log 'in ascolto. Chiudi questa finestra per fermare tutto.' 'Yellow'

$script:Falliti  = @{}
$script:Bloccati = @{}

# ---------- server locale (risposta istantanea in casa) ----------
$FileApp = Join-Path $BaseDir 'casa.html'
$amministratore = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$ascoltatore = New-Object Net.HttpListener
try {
    if ($amministratore) { $ascoltatore.Prefixes.Add("http://+:$($Config.Porta)/") } else { $ascoltatore.Prefixes.Add("http://localhost:$($Config.Porta)/") }
    $ascoltatore.Start()
} catch {
    $ascoltatore = New-Object Net.HttpListener
    $ascoltatore.Prefixes.Add("http://localhost:$($Config.Porta)/")
    try { $ascoltatore.Start() } catch { $ascoltatore = $null }
    $amministratore = $false
}
if ($ascoltatore) {
    $ipLocale = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
        Sort-Object SkipAsSource | Select-Object -First 1).IPAddress
    Write-Host ''
    Log "in casa (istantaneo):  http://localhost:$($Config.Porta)" 'Green'
    if ($amministratore) { Log "da telefono in casa:   http://$($ipLocale):$($Config.Porta)" 'Green' }
    else { Log 'per usarlo dal telefono in casa, avvia il file come amministratore' 'DarkYellow' }
    Log 'da fuori casa: apri la pagina su GitHub, passa dal repository' 'DarkGray'
    Write-Host ''
}

function Rispondi($ctx, $testo, $tipo = 'application/json') {
    $b = [Text.Encoding]::UTF8.GetBytes($testo)
    $ctx.Response.ContentType = "$tipo; charset=utf-8"
    $ctx.Response.Headers.Add('Cache-Control', 'no-store')
    $ctx.Response.Headers.Add('Access-Control-Allow-Origin', '*')
    $ctx.Response.ContentLength64 = $b.Length
    $ctx.Response.OutputStream.Write($b, 0, $b.Length)
    $ctx.Response.Close()
}

function Stato-Json {
    (@{ aggiornatoIl = (Get-Date).ToString('o'); postazione = $env:COMPUTERNAME
        etichetta = $Config.Etichetta; stampante = $Config.Stampante
        dispositivi = $script:Dispositivi } | ConvertTo-Json -Depth 6)
}

function Servi($ctx) {
    $percorso = $ctx.Request.Url.AbsolutePath.ToLower()

    # chiave di accesso + blocco di chi insiste a sbagliarla
    if ($Config.ChiaveAccesso -and $percorso -like '/api/*') {
        $da = $ctx.Request.RemoteEndPoint.Address.ToString()

        if ($script:Bloccati[$da] -and $script:Bloccati[$da] -gt (Get-Date)) {
            $ctx.Response.StatusCode = 429
            Rispondi $ctx '{"errore":"troppi tentativi, riprova piu tardi"}'
            return
        }

        $k = $ctx.Request.Headers['X-Chiave']
        if (-not $k) { $k = $ctx.Request.QueryString['k'] }

        if ($k -ne $Config.ChiaveAccesso) {
            $n = [int]$script:Falliti[$da] + 1
            $script:Falliti[$da] = $n
            Log "chiave errata da $da ($n/$($Config.TentativiMax))" 'Red'
            if ($n -ge $Config.TentativiMax) {
                $script:Bloccati[$da] = (Get-Date).AddMinutes($Config.BloccoMinuti)
                $script:Falliti[$da] = 0
                Log "$da bloccato per $($Config.BloccoMinuti) minuti" 'Red'
            }
            Start-Sleep -Milliseconds 800     # rallenta i tentativi automatici
            $ctx.Response.StatusCode = 401
            Rispondi $ctx '{"errore":"chiave mancante o errata"}'
            return
        }
        $script:Falliti[$da] = 0
    }

    switch -regex ($percorso) {
        '^/$|^/casa\.html$' {
            if (Test-Path $FileApp) { Rispondi $ctx ([IO.File]::ReadAllText($FileApp)) 'text/html' }
            else { Rispondi $ctx '<h1>Manca casa.html accanto al .bat</h1>' 'text/html' }
        }
        '^/api/stato$' { Ricontrolla | Out-Null; $script:UltimoStato = Get-Date; Rispondi $ctx (Stato-Json); Pubblica-Stato }
        '^/api/scansione$' { Scansiona | Out-Null; Rispondi $ctx (Stato-Json); Pubblica-Stato $true }
        '^/api/comando$' {
            $ip = $ctx.Request.QueryString['ip']
            $on = ($ctx.Request.QueryString['on'] -eq 'true')
            $ok = Comanda $ip $on
            $d = $script:Dispositivi | Where-Object { $_.ip -eq $ip }
            if ($ok -and $d) { $d.acceso = $on }
            Log "comando diretto: $(if($on){'accendi'}else{'spegni'}) $ip -> $(if($ok){'ok'}else{'fallito'})" $(if ($ok) { 'Green' } else { 'Red' })
            Rispondi $ctx (@{ ok = $ok; dispositivi = $script:Dispositivi } | ConvertTo-Json -Depth 6)
            Pubblica-Stato $true
        }
        '^/api/esegui$' {
            $id = $ctx.Request.QueryString['id']
            $dati = Leggi-Dati
            $a = $null
            if ($dati.automazioni) { $a = $dati.automazioni | Where-Object { $_.id -eq $id } }
            if ($a) { Esegui-Automazione $a; Rispondi $ctx (Stato-Json) }
            else { Rispondi $ctx '{"ok":false}' }
        }
        '^/api/dati$' {
            if ($ctx.Request.HttpMethod -eq 'PUT') {
                $corpo = (New-Object IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)).ReadToEnd()
                Gh-Scrivi "$C/dati.json" $corpo 'dati casa'
                $script:Dati = $corpo | ConvertFrom-Json
                Rispondi $ctx '{"ok":true}'
            } else {
                $t = '{}'
                try { $t = Gh-Testo "$C/dati.json" } catch { }
                Rispondi $ctx $t
            }
        }
        '^/api/stampanti$' { Rispondi $ctx ((Stampanti) | ConvertTo-Json) }
        '^/api/stampe$' {
            Rispondi $ctx (@{ storico = Ultime-Stampe 20; stampante = $Config.Stampante
                              etichetta = $Config.Etichetta; postazione = $env:COMPUTERNAME } | ConvertTo-Json -Depth 6)
        }
        '^/api/stampa$' {
            $corpo = (New-Object IO.StreamReader($ctx.Request.InputStream, [Text.Encoding]::UTF8)).ReadToEnd()
            $j = $corpo | ConvertFrom-Json
            $nome = ($j.nomeFile -replace '[^a-zA-Z0-9._-]', '_')
            $id = (Get-Date -Format 'yyyyMMddHHmmss') + '-' + ([guid]::NewGuid().ToString('N').Substring(0,5))
            $locale = Join-Path $TempStampe "$($id)__$nome"
            [IO.File]::WriteAllBytes($locale, [Convert]::FromBase64String($j.contenuto))
            $lavoro = [ordered]@{ id = $id; utente = $j.utente; nomeFile = $nome
                                  copie = [int]$j.copie; stampante = $j.stampante; note = $j.note
                                  creatoIl = (Get-Date).ToString('o') }
            $esito = Esegui-Stampa $lavoro $locale
            Rispondi $ctx (@{ ok = ($esito -eq 'stampato'); storico = Ultime-Stampe 20 } | ConvertTo-Json -Depth 6)
        }
        default { $ctx.Response.StatusCode = 404; Rispondi $ctx '{"errore":"non trovato"}' }
    }
}

function Lavoro-Periodico {
    if (((Get-Date) - $script:UltimoGiro).TotalSeconds -ge $Config.IntervalloSec) {
        $script:UltimoGiro = Get-Date
        Processa-Comandi
        Processa-Stampe
    }
    if (((Get-Date) - $script:UltimoStato).TotalSeconds -ge $Config.StatoOgniSec) {
        Ricontrolla | Out-Null
        $script:UltimoStato = Get-Date
        Pubblica-Stato
    }
    Controlla-Automazioni
}

$script:UltimoGiro = [DateTime]::MinValue

while ($true) {
    try {
        if ($ascoltatore) {
            $attesa = $ascoltatore.GetContextAsync()
            while (-not $attesa.Wait(700)) { Lavoro-Periodico }
            Servi $attesa.Result
        } else {
            Lavoro-Periodico
            Start-Sleep -Seconds 2
        }
    } catch {
        Log "errore: $($_.Exception.Message)" 'Red'
    }
}
