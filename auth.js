/* ══════════════════════════════════════════════════════════
   AUTH.JS — RistoCloud by Nodo Italia
   Gestisce login, sessione, verifica abbonamento e loader.
   Richiede: config.js (caricato prima di questo file)
   ══════════════════════════════════════════════════════════ */

/* ────────────────────────────────────────────
   CARICAMENTO LOADER
   ──────────────────────────────────────────── */
class CaricamentoLoader {
  constructor(opzioni = {}) {
    this.durataMs = opzioni.durataMs || 1200;
    this.idLoader = opzioni.idLoader || 'loader';
    this.idLogo = opzioni.idLogo || 'loader-logo';
    this.idApp = opzioni.idApp || 'app';
    this._attivo = false;
    this._inizioTempo = null;
    this._idAnimazione = null;
  }

  impostaDurata(ms) {
    this.durataMs = ms;
  }

  ottieniDurata() {
    return this.durataMs;
  }

  avvia() {
    this._attivo = true;
    this._inizioTempo = null;
    this._idAnimazione = requestAnimationFrame((t) => this._cicloAnimazione(t));
  }

  ferma() {
    this._attivo = false;
    if (this._idAnimazione) {
      cancelAnimationFrame(this._idAnimazione);
      this._idAnimazione = null;
    }
  }

  completaCaricamento() {
    this.ferma();
    this._applicaMaschera(100);

    const loader = document.getElementById(this.idLoader);
    const app = document.getElementById(this.idApp);
    if (!loader || !app) return;

    setTimeout(() => {
      loader.style.transition = 'opacity 0.4s ease';
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.display = 'none';
        app.style.display = 'block';
        app.style.opacity = '0';
        app.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => { app.style.opacity = '1'; });
      }, 400);
    }, 300);
  }

  _cicloAnimazione(timestamp) {
    if (!this._attivo) return;
    if (!this._inizioTempo) this._inizioTempo = timestamp;

    const trascorso = timestamp - this._inizioTempo;
    const progresso = (trascorso % this.durataMs) / this.durataMs;
    const percentuale = this._easeInOut(progresso) * 100;

    this._applicaMaschera(percentuale);
    this._idAnimazione = requestAnimationFrame((t) => this._cicloAnimazione(t));
  }

  _applicaMaschera(percentuale) {
    const logo = document.getElementById(this.idLogo);
    if (!logo) return;
    const bordo = 4;
    const inizio = percentuale;
    const fine = Math.min(percentuale + bordo, 100 + bordo);
    const maschera = `linear-gradient(to right, #000 ${inizio}%, transparent ${fine}%)`;
    logo.style.maskImage = maschera;
    logo.style.webkitMaskImage = maschera;
  }

  _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}

/* ────────────────────────────────────────────
   AUTENTICAZIONE
   ──────────────────────────────────────────── */

/**
 * Esegue il login con email e password via Supabase Auth.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} dati utente o errore
 */
async function eseguiLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    console.error('Errore login:', error.message);
    return { successo: false, errore: error.message };
  }

  const utente = data.user;
  const profilo = await _caricaProfilo(utente.id);

  if (!profilo) {
    return { successo: false, errore: 'Profilo utente non trovato' };
  }

  salvaLogin(profilo);
  return { successo: true, utente: profilo };
}

/**
 * Salva i dati utente in sessionStorage.
 * @param {object} utente
 */
function salvaLogin(utente) {
  sessionStorage.setItem('ristocloud_utente', JSON.stringify(utente));
}

/**
 * Verifica se l'utente è autenticato.
 * Controlla sessione Supabase + token valido.
 * @returns {boolean}
 */
function verificaAuth() {
  const datiSalvati = sessionStorage.getItem('ristocloud_utente');
  if (!datiSalvati) return false;

  try {
    const utente = JSON.parse(datiSalvati);
    if (!utente || !utente.id || !utente.ristorante_id) return false;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Restituisce l'oggetto utente corrente.
 * @returns {object|null}
 */
function ottieniUtente() {
  const dati = sessionStorage.getItem('ristocloud_utente');
  if (!dati) return null;
  try {
    return JSON.parse(dati);
  } catch (e) {
    return null;
  }
}

/**
 * Esegue il logout: cancella sessione Supabase e dati locali.
 */
async function eseguiLogout() {
  await supabase.auth.signOut();
  sessionStorage.removeItem('ristocloud_utente');
  window.location.href = 'login.html';
}

/* ────────────────────────────────────────────
   GESTIONE ABBONAMENTO
   ──────────────────────────────────────────── */

/**
 * Verifica lo stato dell'abbonamento del ristorante.
 * @param {string} ristorante_id
 * @returns {Promise<object>} { stato, giorniRimanenti, tier, piano }
 */
async function verificaAbbonamento(ristorante_id) {
  const { data, error } = await supabase
    .from('ristoranti')
    .select('tier, piano, stato_abbonamento, inizio_prova, fine_prova, inizio_abbonamento, scadenza_abbonamento, rinnovo_automatico')
    .eq('id', ristorante_id)
    .single();

  if (error || !data) {
    console.error('Errore verifica abbonamento:', error?.message);
    return { stato: 'errore', giorniRimanenti: 0 };
  }

  const oggi = new Date();
  let scadenza = null;
  let stato = data.stato_abbonamento;

  /* Calcola scadenza effettiva */
  if (stato === 'prova' && data.fine_prova) {
    scadenza = new Date(data.fine_prova);
  } else if (data.scadenza_abbonamento) {
    scadenza = new Date(data.scadenza_abbonamento);
  }

  /* Calcola giorni rimanenti */
  let giorniRimanenti = 0;
  if (scadenza) {
    giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
  }

  /* Aggiorna stato se scaduto */
  if (giorniRimanenti <= 0 && stato !== 'cancellato') {
    stato = 'scaduto';
    await aggiornaStatoAbbonamento(ristorante_id, 'scaduto');
  }

  return {
    stato: stato,
    giorniRimanenti: giorniRimanenti,
    tier: data.tier,
    piano: data.piano,
    scadenza: scadenza,
    rinnovoAutomatico: data.rinnovo_automatico
  };
}

/**
 * Controlla se l'abbonamento è attivo (o in prova valida).
 * @param {string} ristorante_id
 * @returns {Promise<boolean>}
 */
async function abbonamentoAttivo(ristorante_id) {
  const info = await verificaAbbonamento(ristorante_id);
  return info.stato === 'attivo' || (info.stato === 'prova' && info.giorniRimanenti > 0);
}

/**
 * Restituisce i giorni rimanenti dell'abbonamento.
 * @param {string} ristorante_id
 * @returns {Promise<number>}
 */
async function giorniRimanenti(ristorante_id) {
  const info = await verificaAbbonamento(ristorante_id);
  return info.giorniRimanenti;
}

/**
 * Controlla se la prova gratuita è scaduta.
 * @param {string} ristorante_id
 * @returns {Promise<boolean>}
 */
async function provaScaduta(ristorante_id) {
  const info = await verificaAbbonamento(ristorante_id);
  return info.stato === 'prova' && info.giorniRimanenti <= 0;
}

/**
 * Aggiorna lo stato dell'abbonamento nel DB.
 * @param {string} ristorante_id
 * @param {string} nuovoStato — 'prova' | 'attivo' | 'scaduto' | 'cancellato'
 * @returns {Promise<void>}
 */
async function aggiornaStatoAbbonamento(ristorante_id, nuovoStato) {
  const { error } = await supabase
    .from('ristoranti')
    .update({
      stato_abbonamento: nuovoStato,
      aggiornato_il: new Date().toISOString()
    })
    .eq('id', ristorante_id);

  if (error) {
    console.error('Errore aggiornamento stato:', error.message);
  }
}

/**
 * Se l'abbonamento è scaduto, blocca l'accesso e redirect ai piani.
 * @param {string} ristorante_id
 * @returns {Promise<void>}
 */
async function bloccaAccessoSeScaduto(ristorante_id) {
  const info = await verificaAbbonamento(ristorante_id);

  if (info.stato === 'scaduto' || info.stato === 'cancellato') {
    reindirizzaAPiani();
    return;
  }

  if (info.giorniRimanenti <= GIORNI_AVVISO_ROSSO) {
    mostraBannerScadenza(info.giorniRimanenti, 'rosso');
  } else if (info.giorniRimanenti <= GIORNI_AVVISO_GIALLO) {
    mostraBannerScadenza(info.giorniRimanenti, 'giallo');
  }
}

/**
 * Mostra un banner di avviso scadenza nell'app.
 * @param {number} giorni — giorni rimanenti
 * @param {string} tipo — 'giallo' | 'rosso'
 */
function mostraBannerScadenza(giorni, tipo) {
  const esistente = document.getElementById('banner-scadenza');
  if (esistente) esistente.remove();

  const colori = {
    giallo: { sfondo: '#f59e0b', testo: '#000' },
    rosso:  { sfondo: '#ef4444', testo: '#fff' }
  };
  const c = colori[tipo] || colori.giallo;

  const messaggio = giorni <= 0
    ? 'Il tuo abbonamento è scaduto. Rinnova per continuare a usare RistoCloud.'
    : `Il tuo abbonamento scade tra ${giorni} giorn${giorni === 1 ? 'o' : 'i'}. Rinnova per non perdere l'accesso.`;

  const banner = document.createElement('div');
  banner.id = 'banner-scadenza';
  banner.style.cssText = `
    position:fixed;top:0;left:0;width:100%;z-index:9998;
    background:${c.sfondo};color:${c.testo};
    padding:10px 20px;font-family:Outfit,sans-serif;font-size:13px;font-weight:600;
    display:flex;align-items:center;justify-content:center;gap:12px;
  `;
  banner.innerHTML = `
    <span>${messaggio}</span>
    <a href="piani.html" style="color:${c.testo};text-decoration:underline;font-weight:700">Rinnova ora</a>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:${c.testo};font-size:18px;cursor:pointer;margin-left:8px">✕</button>
  `;
  document.body.prepend(banner);
}

/**
 * Redirect alla pagina piani con messaggio di rinnovo.
 */
function reindirizzaAPiani() {
  window.location.href = 'piani.html?scaduto=1';
}

/* ────────────────────────────────────────────
   FUNZIONI INTERNE
   ──────────────────────────────────────────── */

/**
 * Carica il profilo utente dalla tabella utenti.
 * @param {string} idAuth — UUID da Supabase Auth
 * @returns {Promise<object|null>}
 */
async function _caricaProfilo(idAuth) {
  const { data, error } = await supabase
    .from('utenti')
    .select('id, email, nome, ruolo, tab_consentiti, ristorante_id')
    .eq('id', idAuth)
    .single();

  if (error) {
    console.error('Errore caricamento profilo:', error.message);
    return null;
  }
  return data;
}

/* ────────────────────────────────────────────
   INIZIALIZZAZIONE PAGINA
   Chiamare controllaAccesso() all'avvio di ogni pagina
   protetta (cassa, sala, cucine, menu, stats, config).
   ──────────────────────────────────────────── */

/**
 * Controlla autenticazione + abbonamento.
 * Se tutto OK, completa il loader e mostra l'app.
 * Altrimenti redirect a login o piani.
 */
async function controllaAccesso() {
  const loader = new CaricamentoLoader();
  loader.avvia();

  /* ① Verifica sessione Supabase */
  const { data: sessione } = await supabase.auth.getSession();

  if (!sessione?.session) {
    window.location.href = 'login.html';
    return;
  }

  /* ② Verifica profilo locale */
  if (!verificaAuth()) {
    const profilo = await _caricaProfilo(sessione.session.user.id);
    if (!profilo) {
      window.location.href = 'login.html';
      return;
    }
    salvaLogin(profilo);
  }

  const utente = ottieniUtente();

  /* ③ Verifica abbonamento */
  const infoAbbonamento = await verificaAbbonamento(utente.ristorante_id);

  if (infoAbbonamento.stato === 'scaduto' || infoAbbonamento.stato === 'cancellato') {
    loader.ferma();
    reindirizzaAPiani();
    return;
  }

  /* ④ Mostra banner se in scadenza */
  if (infoAbbonamento.giorniRimanenti <= GIORNI_AVVISO_ROSSO) {
    mostraBannerScadenza(infoAbbonamento.giorniRimanenti, 'rosso');
  } else if (infoAbbonamento.giorniRimanenti <= GIORNI_AVVISO_GIALLO) {
    mostraBannerScadenza(infoAbbonamento.giorniRimanenti, 'giallo');
  }

  /* ⑤ Tutto OK — mostra app */
  loader.completaCaricamento();
}
