/* ══════════════════════════════════════════════════════════
   CONFIG.JS — RistoCloud by Nodo Italia
   Configurazione centralizzata. Mai esporre questo file
   in repository pubblici con le chiavi reali.
   ══════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'INSERIRE_URL_SUPABASE';
const SUPABASE_KEY = 'INSERIRE_CHIAVE_ANONIMA_SUPABASE';

const STRIPE_CHIAVE_PUBBLICA = 'INSERIRE_CHIAVE_PUBBLICA_STRIPE';

/* ── URL di redirect dopo pagamento ── */
const URL_SUCCESSO_PAGAMENTO = window.location.origin + '/benvenuto.html';
const URL_ANNULLAMENTO_PAGAMENTO = window.location.origin + '/piani.html';

/* ── Endpoint Funzioni Edge ── */
const ENDPOINT_SESSIONE_PAGAMENTO = SUPABASE_URL + '/functions/v1/crea-sessione-pagamento';
const ENDPOINT_PORTALE_CLIENTE = SUPABASE_URL + '/functions/v1/portale-cliente';

/* ── Impostazioni abbonamento ── */
const GIORNI_PROVA = 10;
const GIORNI_AVVISO_GIALLO = 7;
const GIORNI_AVVISO_ROSSO = 3;

/* ── Supabase Client ── */
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
