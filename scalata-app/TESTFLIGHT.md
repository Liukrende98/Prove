# Scalata con Apple Developer e TestFlight (niente Xcode, niente cavo)

GitHub costruisce e firma l'app su un suo Mac e la carica su TestFlight. Tu la installi dall'app **TestFlight** sull'iPhone. Ogni versione dura 90 giorni; per rinnovarla rilanci la pubblicazione.

## 1. Account (una volta)
1. Iscriviti all'**Apple Developer Program** (99 €/anno) su developer.apple.com/programs. L'attivazione può richiedere fino a 48 ore.
2. **Team ID**: developer.apple.com › Account › **Membership details** › copia il *Team ID* (10 caratteri).

## 2. Registra l'app (dal sito, una volta)
1. developer.apple.com › Account › **Certificates, IDs & Profiles** › **Identifiers** › **+** › *App IDs* › *App* › Description `Scalata` · Bundle ID **Explicit** `com.luca.scalata` › Register.
   - Se quel Bundle ID è già preso, usane un altro (es. `com.luca.scalatagioco`) e cambialo anche in `project.yml`, alla riga `PRODUCT_BUNDLE_IDENTIFIER`.
2. **appstoreconnect.apple.com** › **App** › **+** › *Nuova app* · Piattaforma iOS · Nome: un nome libero sull'App Store (es. `Scalata Presidente`) · Lingua Italiano · Bundle ID quello di sopra · SKU `scalata1` › Crea.
3. App Store Connect › **Utenti e accessi** › **Integrazioni** › **Chiavi API di App Store Connect** › **+** · Nome `GitHub` · Accesso **Admin** › Genera.
   - Annota **Key ID** e **Issuer ID** (in alto).
   - **Scarica la chiave** (.p8): si può scaricare una volta sola, tienila al sicuro.

## 3. Collega GitHub (una volta)
Nel repository `scalata-app` (con i file di questo pacchetto) › **Settings** › **Secrets and variables** › **Actions** › **New repository secret**, quattro volte:
| Nome | Valore |
|---|---|
| `TEAM_ID` | il Team ID |
| `ASC_KEY_ID` | il Key ID |
| `ASC_ISSUER_ID` | l'Issuer ID |
| `ASC_KEY` | apri il file .p8 con TextEdit e incolla **tutto**, comprese le righe BEGIN/END |

## 4. Pubblica
1. Scheda **Actions** › **Pubblica su TestFlight** › **Run workflow**. Dopo 10-15 minuti diventa verde.
2. Su App Store Connect › la tua app › **TestFlight** la build compare dopo 10-30 minuti di elaborazione.
3. Sotto **Test interni** crea un gruppo, aggiungi te stesso e la build.
4. Sull'iPhone installa **TestFlight** dall'App Store, entra col tuo Apple ID e tocca **Installa** su Scalata.

## Versioni nuove
Sostituisci `web/index.html` nel repository e rilancia **Pubblica su TestFlight**. TestFlight ti avvisa e aggiorni con un tocco; le carriere salvate restano.
