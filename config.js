/* ══════════════════════════════════════════════════════════
   CONFIG.JS — RistoCloud by Nodo Italia
   ══════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'lttwbxlvhtepxtorkimo';
const SUPABASE_KEY = 'sb_publishable_BY79G2WCKV5Zxq4z5bxKRw_lChbZEY7';

const STRIPE_CHIAVE_PUBBLICA = 'INSERIRE_CHIAVE_PUBBLICA_STRIPE';

const URL_SUCCESSO_PAGAMENTO = window.location.origin + '/benvenuto.html';
const URL_ANNULLAMENTO_PAGAMENTO = window.location.origin + '/piani.html';

const ENDPOINT_SESSIONE_PAGAMENTO = SUPABASE_URL + '/functions/v1/crea-sessione-pagamento';
const ENDPOINT_PORTALE_CLIENTE = SUPABASE_URL + '/functions/v1/portale-cliente';

const GIORNI_PROVA = 10;
const GIORNI_AVVISO_GIALLO = 7;
const GIORNI_AVVISO_ROSSO = 3;

/* ── Supabase Client ── */
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
