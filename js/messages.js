-- ========================================
-- SCRIPT SQL: PULIZIA AUTOMATICA UTENTI OFFLINE
-- ========================================
-- Questo script setta automaticamente online=false per utenti
-- che non hanno aggiornato last_seen negli ultimi 2 minuti

-- 1. Crea funzione per pulire utenti offline
CREATE OR REPLACE FUNCTION cleanup_offline_users()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Setta offline tutti gli utenti con last_seen > 2 minuti fa
  UPDATE "Utenti"
  SET online = false
  WHERE online = true
    AND last_seen < NOW() - INTERVAL '2 minutes';
  
  RAISE NOTICE 'Pulizia utenti offline completata';
END;
$$;

-- 2. OPZIONE A: Esegui manualmente quando vuoi
-- Comando: SELECT cleanup_offline_users();

-- 3. OPZIONE B: Crea trigger che esegue ogni volta che carichi utenti
-- (Sconsigliato - meglio CRON job)

-- 4. OPZIONE C: Usa pg_cron (se abilitato)
-- Esegue ogni 1 minuto
-- SELECT cron.schedule('cleanup-offline-users', '*/1 * * * *', 'SELECT cleanup_offline_users();');

-- ========================================
-- NOTA: Su Supabase, usa invece una Edge Function
-- o uno Scheduled Function (Supabase Pro)
-- ========================================

-- Per testare:
SELECT cleanup_offline_users();

-- Verifica risultato:
SELECT id, username, online, last_seen 
FROM "Utenti" 
WHERE last_seen IS NOT NULL
ORDER BY last_seen DESC
LIMIT 10;
