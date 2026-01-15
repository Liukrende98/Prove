-- ===============================================
-- TABELLA SEGUITI - Per gestire follow/unfollow
-- ===============================================

-- 1. Crea tabella Seguiti (se non esiste)
CREATE TABLE IF NOT EXISTS "Seguiti" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    utente_id UUID NOT NULL REFERENCES "Utenti"(id) ON DELETE CASCADE,
    seguito_id UUID NOT NULL REFERENCES "Utenti"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Vincolo: non puoi seguire te stesso
    CONSTRAINT no_self_follow CHECK (utente_id != seguito_id),
    
    -- Vincolo: coppia unica (utente può seguire un altro utente solo una volta)
    UNIQUE(utente_id, seguito_id)
);

-- 2. Indici per performance
CREATE INDEX IF NOT EXISTS idx_seguiti_utente ON "Seguiti"(utente_id);
CREATE INDEX IF NOT EXISTS idx_seguiti_seguito ON "Seguiti"(seguito_id);

-- 3. RLS Policy - Gli utenti possono vedere chi seguono
CREATE POLICY "Users can view their follows" ON "Seguiti"
    FOR SELECT
    USING (auth.uid() = utente_id);

-- 4. RLS Policy - Gli utenti possono aggiungere follow
CREATE POLICY "Users can follow others" ON "Seguiti"
    FOR INSERT
    WITH CHECK (auth.uid() = utente_id);

-- 5. RLS Policy - Gli utenti possono rimuovere follow
CREATE POLICY "Users can unfollow others" ON "Seguiti"
    FOR DELETE
    USING (auth.uid() = utente_id);

-- 6. Abilita RLS
ALTER TABLE "Seguiti" ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- FUNZIONI HELPER
-- ===============================================

-- Funzione per seguire un utente
CREATE OR REPLACE FUNCTION follow_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO "Seguiti" (utente_id, seguito_id)
    VALUES (auth.uid(), target_user_id)
    ON CONFLICT (utente_id, seguito_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per smettere di seguire
CREATE OR REPLACE FUNCTION unfollow_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
    DELETE FROM "Seguiti"
    WHERE utente_id = auth.uid() 
    AND seguito_id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per verificare se segui un utente
CREATE OR REPLACE FUNCTION is_following(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "Seguiti"
        WHERE utente_id = auth.uid() 
        AND seguito_id = target_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- TRIGGER: Auto-follow quando invii primo messaggio
-- ===============================================

CREATE OR REPLACE FUNCTION auto_follow_on_first_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando invii un messaggio, segui automaticamente il destinatario
    INSERT INTO "Seguiti" (utente_id, seguito_id)
    VALUES (NEW.mittente_id, NEW.destinatario_id)
    ON CONFLICT (utente_id, seguito_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_follow ON "Messaggi";
CREATE TRIGGER trigger_auto_follow
    AFTER INSERT ON "Messaggi"
    FOR EACH ROW
    EXECUTE FUNCTION auto_follow_on_first_message();

-- ===============================================
-- ISTRUZIONI D'USO
-- ===============================================

/*
1. Esegui tutto questo SQL su Supabase (SQL Editor)

2. La tabella Seguiti verrà creata con:
   - id (UUID, primary key)
   - utente_id (chi segue)
   - seguito_id (chi viene seguito)
   - created_at (timestamp)

3. Funzionalità automatiche:
   - ✅ Non puoi seguire te stesso
   - ✅ Puoi seguire ogni utente solo una volta
   - ✅ Quando invii primo messaggio → auto-follow
   - ✅ RLS policies per sicurezza

4. Come usare dal frontend:

   // Seguire un utente
   await supabaseClient
     .from('Seguiti')
     .insert({ utente_id: myUserId, seguito_id: targetUserId });

   // Smettere di seguire
   await supabaseClient
     .from('Seguiti')
     .delete()
     .eq('utente_id', myUserId)
     .eq('seguito_id', targetUserId);

   // Verificare se segui qualcuno
   const { data } = await supabaseClient
     .from('Seguiti')
     .select('*')
     .eq('utente_id', myUserId)
     .eq('seguito_id', targetUserId)
     .single();
   
   const isFollowing = !!data;

5. Il sistema messaggi ora:
   - ✅ Mostra stella gialla su avatar se segui l'utente
   - ✅ Mostra icona verde nel nome se segui l'utente
   - ✅ Swipe destra → elimina conversazione
   - ✅ Se segui l'utente → chiede conferma per unfollow

FATTO! Il sistema follow/unfollow è pronto.
*/
