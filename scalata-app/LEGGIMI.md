# Scalata: app vera per iPhone, senza Xcode sul tuo Mac

L'app la costruisce gratis GitHub su un suo Mac nuovo. Tu scarichi il file `Scalata.ipa` e lo installi sull'iPhone con **Sideloadly** (gratis), che funziona anche su Mac vecchi e su Windows.

## 1. Fai costruire l'app a GitHub (10 minuti la prima volta)
1. github.com › **+** › **New repository** · nome `scalata-app` · **Public** · **Create repository**.
2. **uploading an existing file** › trascina **tutto il contenuto** di questa cartella: `project.yml`, `Sources`, `Resources`, `web` e la cartella nascosta `.github`.
   - Sul Mac le cartelle che iniziano col punto sono nascoste: nel Finder premi **Cmd + Maiusc + .** per vederle.
   - Se `.github` non si carica: su GitHub **Add file › Create new file**, nome `.github/workflows/build.yml`, incolla il contenuto del file e **Commit**.
3. **Commit changes**. Poi apri la scheda **Actions**: parte "Costruisci app iPhone". Dopo 5-10 minuti diventa verde.
4. Clicca sull'esecuzione verde › in fondo, sotto **Artifacts**, scarica **Scalata-ipa**. È uno zip: dentro c'è `Scalata.ipa`.

## 2. Installala sull'iPhone con Sideloadly
1. Scarica **Sideloadly** da sideloadly.io (gratis) e installalo sul Mac.
2. Collega l'iPhone col cavo, sbloccalo, tocca **Autorizza**.
3. Apri Sideloadly: in alto deve comparire il tuo iPhone. Trascina dentro `Scalata.ipa`, scrivi il tuo **Apple ID** e premi **Start**. Inserisci la password dell'Apple ID quando la chiede (serve solo ad Apple per firmare l'app).
4. Sull'iPhone, la prima volta:
   - Impostazioni › Privacy e sicurezza › **Modalità sviluppatore** › attiva e riavvia;
   - Impostazioni › Generali › **VPN e gestione dispositivi** › il tuo Apple ID › **Autorizza**.
5. Apri **Scalata** dall'icona.

## Da sapere
- Con l'Apple ID gratis Apple fa durare l'app **7 giorni**: ricollega l'iPhone e premi di nuovo Start in Sideloadly (oppure attiva in Sideloadly il rinnovo automatico via Wi-Fi). I salvataggi restano.
- Per una versione nuova del gioco: sostituisci `web/index.html` su GitHub, aspetta la nuova esecuzione verde in Actions, scarica il nuovo `.ipa` e reinstallalo con Sideloadly.
