import React, { useState } from "react";
import { Scale, Download, ShieldCheck, FileText, CheckCircle2, Copy, Lock, Mail, ExternalLink } from "lucide-react";
import { generateLegalPDF } from "../utils/legalPdfGenerator";

interface LegalTermsSectionProps {
  hasAcceptedTerms: boolean;
  onToggleAcceptance: (accepted: boolean) => void;
}

export const LegalTermsSection: React.FC<LegalTermsSectionProps> = ({
  hasAcceptedTerms,
  onToggleAcceptance,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPDF = () => {
    setDownloadingPdf(true);
    try {
      generateLegalPDF();
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: "📄 Download avviato: ViaCamper_Termini_e_Privacy_Policy_v2.1.pdf",
          },
        })
      );
    } catch (error) {
      console.error("Errore generazione PDF:", error);
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: {
            message: "❌ Errore durante la generazione del PDF. Riprova.",
          },
        })
      );
    } finally {
      setTimeout(() => setDownloadingPdf(false), 1000);
    }
  };

  const fullTextToCopy = `ViaCamper
Termini e Condizioni di Servizio & Informativa sulla Privacy (GDPR UE 2016/679)

Titolare dell'App, del Software e del Trattamento Dati: ViaCamper nella persona di Simone Sambucci
Email di Contatto e Privacy: viacamperapp@gmail.com
Ultimo aggiornamento: Agosto 2026 • Versione: 2.1 (Valida per App Mobile iOS / Android e Servizi Connessi)

PARTE I — TERMINI E CONDIZIONI DI SERVIZIO

1. Oggetto del Servizio e Titolarietà
ViaCamper è un'applicazione mobile e software proprietario privato concepito, sviluppato e gestito dal Titolare ViaCamper nella persona di Simone Sambucci. La piattaforma fornisce funzionalità dedicate al turismo itinerante, tra cui la mappatura e ricerca di aree di sosta camper, campeggi, punti d'interesse (POI), strumenti di navigazione e calcolo rotte personalizzate basate sulle dimensioni del veicolo (sagomato camper), diario di bordo digitale, nonché un assistente virtuale basato su intelligenza artificiale denominato "Rolly".
Utilizzando l'applicazione ViaCamper, l'utente dichiara di aver letto, compreso e accettato integralmente i presenti Termini di Servizio. Qualora l'utente non intenda accettare le presenti condizioni, è tenuto a non utilizzare l'applicazione.

2. Account Utente e Sicurezza
L'accesso a determinate funzionalità richiede la creazione di un account personale. L'utente si impegna a fornire informazioni veritiere, accurate e aggiornate (es. indirizzo e-mail valido e dimensioni reali del veicolo).
L'utente è l'unico responsabile della custodia e riservatezza delle proprie credenziali di accesso. Il Titolare (ViaCamper nella persona di Simone Sambucci) si riserva il diritto di sospendere o chiudere permanentemente l'account dell'utente in caso di:
• Violazione dei presenti Termini o delle normative vigenti;
• Tentativi di estrazione massiva o automatizzata di dati (scraping non autorizzato);
• Uso improprio o abusivo dell'assistente AI Rolly;
• Pubblicazione di contenuti illegali, diffamatori, offensivi o lesivi di diritti terzi.

3. Accuratezza dei Dati, Mappe e Limitazioni di Responsabilità sulla Navigazione
Le informazioni sulle strutture di sosta, campeggi, servizi, restrizioni ed itinerari provengono da una combinazione di dati proprietari, contributi degli utenti (UGC) e API/banche dati di terze parti (tra cui OpenStreetMap e Google Places API).
Sebbene il Titolare adotti ogni ragionevole misura per mantenere i dati aggiornati:
• Nessuna garanzia di completezza: Non si garantisce l'assoluta esattezza, continuità o aggiornamento in tempo reale di orari, prezzi, tariffe, disponibilità o divieti locali. L'utente è tenuto a verificare preventivamente in loco o tramite i canali ufficiali della struttura;
• Navigazione e limiti sagoma camper: I calcoli di percorso, i suggerimenti sulle rotte e gli avvisi relativi ai limiti di altezza, peso e larghezza del veicolo forniti da ViaCamper hanno carattere unicamente informativo, indicativo e ausiliario. Il conducente del veicolo rimane l'unico e insindacabile responsabile della condotta di guida, del rispetto del Codice della Strada e della segnaletica stradale verticale/orizzontale reale. Il Titolare declina ogni responsabilità per sanzioni amministrative (multe), danni al veicolo o inconvenienti di percorso derivanti dall'affidamento sulle indicazioni dell'app.

4. Assistente Virtuale AI ("Rolly")
ViaCamper integra l'assistente virtuale Rolly, operato tramite modelli di intelligenza artificiale generativa (Google Gemini API).
• Le risposte fornite da Rolly sono generate automaticamente e possono contenere imprecisioni, inesattezze o dati non aggiornati;
• I contenuti elaborati da Rolly non costituiscono in alcun caso pareri legali, professionali, di sicurezza stradale o vincolanti;
• L'utente è tenuto a verificare in modo indipendente le informazioni critiche (es. accessibilità strade, passi montani, normative sulla sosta libera o transito) fornite dall'assistente prima di intraprendere il viaggio.

5. Proprietà Intellettuale e Licenze di Terze Parti
L'applicazione ViaCamper, compresi il codice sorgente, le architetture software, gli algoritmi di calcolo della rotta e sagomatura, l'interfaccia utente (UI/UX), il marchio, il logo e la veste grafica, è di proprietà esclusiva di ViaCamper nella persona di Simone Sambucci ed è tutelata dalle leggi sul diritto d'autore (Legge 633/1941 e successive modifiche) e dalla proprietà industriale. È vietata qualsiasi decompilazione, reverse engineering, copia o redistribuzione non autorizzata.
I servizi di terze parti integrati sono utilizzati nel rispetto delle relative licenze:
• Google Maps Platform & Google Places API: © Google LLC. Dati di ricerca punti di interesse, mappe ed elenchi;
• OpenStreetMap (OSM) & Overpass API: © Contributori OpenStreetMap, dati distribuiti sotto licenza Open Database License (ODbL);
• Google Gemini AI: Servizi di intelligenza artificiale forniti da Google LLC;
• Audio & Streaming: I brani musicali dimostrativi sono ospitati tramite SoundHelix (soundhelix.com). I flussi radiofonici appartengono ai rispettivi editori e licenzianti.

6. Contenuti Generati dall'Utente (UGC) e Licenza d'Uso
Caricando o inviando contenuti all'interno dell'applicazione ViaCamper (inclusi: recensioni, votazioni, fotografie, diari di bordo, segnalazioni di tappe o post nel forum/community):
• L'utente mantiene la titolarità della paternità morale dei propri contenuti;
• L'utente concede al Titolare (ViaCamper nella persona di Simone Sambucci) una licenza d'uso non esclusiva, gratuita, perpetua, irrevocabile, trasferibile e valida in tutto il mondo per memorizzare, riprodurre, pubblicare, distribuire, adattare, mostrare e promuovere tali contenuti all'interno dell'app, del sito web e dei canali di comunicazione collegati a ViaCamper;
• L'utente garantisce di essere il legittimo titolare dei diritti sui contenuti inviati e che essi non violano diritti di terzi o norme di legge, manlevando il Titolare da qualsiasi pretesa risarcitoria;
• Il Titolare si riserva il diritto insindacabile di rimuovere o modificare, senza preavviso, qualsiasi contenuto ritenuto inappropriato, inesatto, offensivo o contrario alle regole della piattaforma.

7. Regole di Uso Accettabile
È severamente fatto divieto all'utente di:
• Utilizzare script o sistemi automatizzati per estrarre dati dal servizio;
• Superare o tentare di aggirare i limiti di frequenza delle chiamate API (rate limit) o le misure di sicurezza del server;
• Rivedere, rivendere o commercializzare i contenuti o i dati integrati nell'app senza autorizzazione scritta.

8. Esclusione di Garanzia e Limitazione di Responsabilità
Il servizio ViaCamper è fornito «così com'è» ("AS IS") e «come disponibile», senza garanzie di alcun tipo, esplicite o implicite. Nei limiti massimi consentiti dalla legge italiana, il Titolare ViaCamper nella persona di Simone Sambucci non risponderà di alcun danno diretto, indiretto, incidentale o consequenziale (inclusi a titolo esemplificativo: perdita di tempo, ritardi di viaggio, spese di parcheggio o traino, sanzioni stradali o mancata fruizione di strutture) derivante dall'uso o dall'impossibilità di utilizzare l'applicazione.

9. Legge Applicabile e Foro Competente
I presenti Termini di Servizio sono regolati e interpretati esclusivamente in conformità alla legislazione italiana. Per qualsiasi controversia inerente all'interpretazione, esecuzione o validità del presente contratto, sarà competente in via esclusiva il Foro del luogo di residenza del Titolare (ViaCamper nella persona di Simone Sambucci), fatte salve le disposizioni inderogabili a tutela dei consumatori.

PARTE II — INFORMATIVA SULLA PRIVACY (GDPR UE 2016/679)

1. Titolare del Trattamento dei Dati
Il Titolare del trattamento dei dati personali è ViaCamper nella persona di Simone Sambucci.
Contatto e-mail dedicato alla Privacy e alle comunicazioni legali: viacamperapp@gmail.com

2. Categorie di Dati Personali Raccolti
ViaCamper raccoglie e tratta le seguenti tipologie di dati personali:
• Dati di Account e Profilo: Indirizzo e-mail, nome utente, preferenze di viaggio e dati tecnici del veicolo (es. altezza, peso, lunghezza del camper) inseriti dall'utente;
• Dati di Geolocalizzazione: Posizione GPS rilevata dal dispositivo (in tempo reale, approssimativa o precisa) previo consenso dell'utente, usata per mostrare punti d'interesse nelle vicinanze, calcolare rotte ed alimentare il diario di bordo;
• Interazioni con Assistente AI (Rolly): Testo delle richieste, domande inviate e contesto di ricerca necessario alla generazione della risposta;
• Contenuti Utente (UGC): Foto, recensioni, valutazioni e resoconti del diario di bordo. I metadati di geolocalizzazione (EXIF) presenti nelle fotografie vengono automaticamente rimossi prima della pubblicazione;
• Dati Tecnici e di Utilizzo: Indirizzo IP, identificatori tecnici del dispositivo, sistema operativo, versione dell'app e log di sistema per finalità di sicurezza e diagnostica crash.

3. Finalità e Basi Giuridiche del Trattamento
• Erogazione delle funzionalità dell'app (ricerca areasosta, diario di bordo, account utente) -> Esecuzione del contratto (Art. 6.1.b GDPR)
• Rilevamento della posizione GPS (navigazione e ricerca tappe vicine) -> Consenso esplicito dell'utente (Art. 6.1.a GDPR) — revocabile dalle impostazioni del dispositivo
• Elaborazione risposte dell'assistente AI Rolly -> Esecuzione del contratto (Art. 6.1.b GDPR) e legittimo interesse al miglioramento dei servizi (Art. 6.1.f)
• Sicurezza della piattaforma, prevenzione frodi, abusi ed attacchi informatici -> Legittimo interesse del Titolare (Art. 6.1.f GDPR)
• Adempimento di obblighi di legge o richieste delle Autorità competenti -> Obbligo legale (Art. 6.1.c GDPR)

4. Gestione della Geolocalizzazione e Posizione in Background
L'accesso ai dati di geolocalizzazione avviene esclusivamente previa autorizzazione concessa dall'utente tramite i permessi nativi del sistema operativo (iOS o Android):
• Posizione in Primo Piano: Utilizzata per posizionare l'utente sulla mappa, calcolare le distanze dai campeggi ed allertare per eventuali ostacoli sulla sagoma del veicolo;
• Posizione in Background: Richiesta unicamente laddove l'utente attivi la registrazione continua del diario di viaggio. Può essere disattivata in qualsiasi momento dalle impostazioni di sistema del dispositivo senza pregiudicare la fruizione base dell'app. Le coordinate memorizzate nel diario sono protette da cifratura.

5. Trattamento Dati nell'Assistente AI ("Rolly")
Per erogare le risposte vocali e testuali dell'assistente Rolly, i quesiti inviati dall'utente vengono elaborati tramite l'infrastruttura di intelligenza artificiale Google Gemini API (operata da Google LLC):
• Dati inviati: Esclusivamente il testo del quesito e il contesto geografico approssimativo necessario a rispondere (es. città o zona di ricerca);
• Dati NON inviati: Nome, cognome, e-mail, password, foto personali o contenuti riservati del diario di bordo non sono mai trasmessi ai modelli di IA;
• Cronologia: L'utente ha la facoltà di cancellare lo storico delle conversazioni con Rolly direttamente dalle opzioni interne dell'applicazione.

6. Cookie, Storage Locale e Tracciamento
ViaCamper non utilizza cookie di profilazione pubblicitaria né strumenti di tracciamento commerciale di terze parti. L'applicazione si avvale unicamente di meccanismi di memorizzazione tecnica locale (localStorage / SharedPreferences) indispensabili per salvare le preferenze dell'utente (es. unità di misura, dati veicolo) e mantenere attiva la sessione o la cache offline delle mappe.

7. Destinatari dei Dati e Fornitori di Servizi (Responsabili)
I dati personali raccolti potranno essere trattati dai seguenti soggetti terzi, operanti in qualità di responsabili o autonomi titolari:
• Google Firebase / Cloud Firestore (Google LLC): Infrastruttura cloud protetta per il salvataggio dei dati dell'account e del diario di bordo;
• Google LLC (Gemini API & Maps API): Fornitore dei servizi cartografici e di intelligenza artificiale per l'assistente Rolly;
• Apple Inc. e Google LLC: Gestori degli store digitali (App Store e Google Play) per la distribuzione dell'applicazione e la gestione tecnica dei crash log.

8. Trasferimento dei Dati Extra-UE
Alcuni dei fornitori tecnologici sopra indicati (es. Google LLC) hanno sede o infrastrutture situate negli Stati Uniti d'America. Il trasferimento dei dati al di fuori dello Spazio Economico Europeo (SEE) avviene in piena conformità alle garanzie previste dal GDPR, mediante l'adozione delle Clausole Contrattuali Standard (Standard Contractual Clauses - SCC) approvate dalla Commissione Europea e la certificazione sotto l'EU-U.S. Data Privacy Framework.

9. Periodo di Conservazione dei Dati
• Dati dell'Account: Conservati per tutta la durata dell'account attivo e cancellati entro 30 giorni dalla richiesta di eliminazione dell'account;
• Diario di Bordo e Tracce GPS: Mantenuti finché l'utente li conserva nell'app; eliminati immediatamente a seguito di cancellazione da parte dell'utente o eliminazione dell'account;
• Conversazioni con Rolly AI: Conservate nei sistemi per un periodo massimo di 90 giorni per ragioni di diagnostica e sicurezza, salvo cancellazione manuale anticipata;
• Log di Sicurezza: Trattenuti per un periodo massimo di 12 mesi per esigenze di difesa da attacchi informatici.

10. Diritti dell'Interessato e Diritto all'Oblio
Ai sensi degli Artt. 15-22 del Regolamento UE 2016/679 (GDPR), l'utente ha il diritto in qualsiasi momento di esercitare i seguenti diritti:
• Accesso e Rettifica: Verificare i propri dati personali e chiederne la correzione o l'aggiornamento;
• Cancellazione (Diritto all'Oblio - Art. 17 GDPR): Richiedere la cancellazione definitiva dei propri dati personali e del proprio account;
• Limitazione e Opposizione: Opporsi al trattamento o chiederne la limitazione nei casi previsti dalla legge;
• Portabilità dei Dati: Ricevere una copia dei propri dati personali in un formato strutturato e di uso comune (es. JSON o CSV);
• Revoca del Consenso: Revocare in qualsiasi momento il consenso precedentemente prestato per la geolocalizzazione;
• Reclamo: Proporre reclamo formale all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).
Per esercitare un qualsiasi diritto, l'utente può inviare una richiesta formale via e-mail all'indirizzo: viacamperapp@gmail.com. Il Titolare fornirà riscontro entro il termine di 30 giorni.

11. Misure di Sicurezza
I dati personali sono protetti tramite idonee misure di sicurezza tecniche e organizzative, incluse la cifratura delle comunicazioni in transito (HTTPS/TLS), la cifratura dei dati a riposo nei database Firebase, il controllo degli accessi su base strictly need-to-know e procedure di backup periodico.

12. Minori di Età
L'applicazione ViaCamper non è destinata all'uso da parte di minori di anni 14. Il Titolare non raccoglie consapevolmente dati personali relativi ai minori di 14 anni. Qualora un genitore o tutore dovesse riscontrare l'inserimento di dati da parte di un minore, è invitato a contattare tempestivamente il Titolare all'indirizzo viacamperapp@gmail.com per richiederne la rimozione immediata.

13. Modifiche ai Termini e alla Privacy Policy
Il Titolare si riserva il diritto di apportare modifiche o aggiornamenti ai presenti Termini e alla Privacy Policy per adeguarli a novità legislative o evoluzioni tecniche dell'applicazione ViaCamper. La versione aggiornata sarà sempre consultabile all'interno dell'app e sui canali ufficiali. Gli utenti saranno informati di modifiche sostanziali tramite notifica in-app o e-mail.`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 sm:p-6 font-sans">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-br from-[#1E3A6E] via-[#2A4B82] to-[#3E4A35] text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-md">
              DOCUMENTO UFFICIALE VIACAMPER (v2.1 • Agosto 2026)
            </span>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span>{downloadingPdf ? "Generazione PDF..." : "Scarica Regolamento PDF"}</span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 text-white">
            <Scale className="w-7 h-7 text-emerald-300 shrink-0" />
            ViaCamper — Termini e Condizioni & Privacy Policy
          </h1>

          <p className="text-xs text-slate-200 leading-relaxed max-w-3xl">
            Regolamento integrato di Servizio, Licenza Software, Diritto d'Autore e Informativa sulla Privacy ai sensi del Regolamento Europeo GDPR (UE 2016/679).
          </p>
        </div>
      </div>

      {/* Meta Header Box */}
      <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-700">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#3E4A35]/10 text-[#3E4A35] rounded-xl flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Titolare del Trattamento
            </span>
            <strong className="text-slate-900 block font-extrabold text-sm">ViaCamper</strong>
            <span className="text-slate-600">nella persona di Simone Sambucci</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Email Contatto Legale & Privacy
            </span>
            <a
              href="mailto:viacamperapp@gmail.com"
              className="text-blue-600 hover:underline font-extrabold text-sm block"
            >
              viacamperapp@gmail.com
            </a>
            <span className="text-slate-500">Riscontro garantito entro 30 giorni</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Validità & Versione
            </span>
            <strong className="text-slate-900 block font-extrabold text-sm">Versione 2.1 (Agosto 2026)</strong>
            <span className="text-slate-500">Valida per App Mobile iOS / Android</span>
          </div>
        </div>
      </div>

      {/* Main Document Content Container */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-8 text-slate-800 leading-relaxed text-xs sm:text-sm">
        
        {/* PARTE I */}
        <section className="space-y-5">
          <div className="border-b-2 border-[#1E3A6E] pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md">
              PARTE I
            </span>
            <h2 className="text-lg font-black text-[#1E3A6E] mt-1">
              TERMINI E CONDIZIONI DI SERVIZIO
            </h2>
          </div>

          {/* 1 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm flex items-center gap-2">
              <span>1. Oggetto del Servizio e Titolarietà</span>
            </h3>
            <p className="text-slate-600 leading-relaxed">
              ViaCamper è un'applicazione mobile e software proprietario privato concepito, sviluppato e gestito dal Titolare <strong>ViaCamper nella persona di Simone Sambucci</strong>. La piattaforma fornisce funzionalità dedicate al turismo itinerante, tra cui la mappatura e ricerca di aree di sosta camper, campeggi, punti d'interesse (POI), strumenti di navigazione e calcolo rotte personalizzate basate sulle dimensioni del veicolo (sagomato camper), diario di bordo digitale, nonché un assistente virtuale basato su intelligenza artificiale denominato "Rolly".
            </p>
            <p className="text-slate-600 leading-relaxed">
              Utilizzando l'applicazione ViaCamper, l'utente dichiara di aver letto, compreso e accettato integralmente i presenti Termini di Servizio. Qualora l'utente non intenda accettare le presenti condizioni, è tenuto a non utilizzare l'applicazione.
            </p>
          </div>

          {/* 2 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              2. Account Utente e Sicurezza
            </h3>
            <p className="text-slate-600 leading-relaxed">
              L'accesso a determinate funzionalità richiede la creazione di un account personale. L'utente si impegna a fornire informazioni veritiere, accurate e aggiornate (es. indirizzo e-mail valido e dimensioni reali del veicolo).
            </p>
            <p className="text-slate-600 leading-relaxed">
              L'utente è l'unico responsabile della custodia e riservatezza delle proprie credenziali di accesso. Il Titolare (ViaCamper nella persona di Simone Sambucci) si riserva il diritto di sospendere o chiudere permanentemente l'account dell'utente in caso di:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Violazione dei presenti Termini o delle normative vigenti;</li>
              <li>Tentativi di estrazione massiva o automatizzata di dati (scraping non autorizzato);</li>
              <li>Uso improprio o abusivo dell'assistente AI Rolly;</li>
              <li>Pubblicazione di contenuti illegali, diffamatori, offensivi o lesivi di diritti terzi.</li>
            </ul>
          </div>

          {/* 3 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              3. Accuratezza dei Dati, Mappe e Limitazioni di Responsabilità sulla Navigazione
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Le informazioni sulle strutture di sosta, campeggi, servizi, restrizioni ed itinerari provengono da una combinazione di dati proprietari, contributi degli utenti (UGC) e API/banche dati di terze parti (tra cui OpenStreetMap e Google Places API). Sebbene il Titolare adotti ogni ragionevole misura per mantenere i dati aggiornati:
            </p>
            <div className="space-y-2 pl-2">
              <p className="text-slate-600 leading-relaxed">
                • <strong>Nessuna garanzia di completezza:</strong> Non si garantisce l'assoluta esattezza, continuità o aggiornamento in tempo reale di orari, prezzi, tariffe, disponibilità o divieti locali. L'utente è tenuto a verificare preventivamente in loco o tramite i canali ufficiali della struttura;
              </p>
              <p className="text-slate-600 leading-relaxed">
                • <strong>Navigazione e limiti sagoma camper:</strong> I calcoli di percorso, i suggerimenti sulle rotte e gli avvisi relativi ai limiti di altezza, peso e larghezza del veicolo forniti da ViaCamper hanno carattere unicamente informativo, indicativo e ausiliario. Il conducente del veicolo rimane l'unico e insindacabile responsabile della condotta di guida, del rispetto del Codice della Strada e della segnaletica stradale verticale/orizzontale reale. Il Titolare declina ogni responsabilità per sanzioni administrative (multe), danni al veicolo o inconvenienti di percorso derivanti dall'affidamento sulle indicazioni dell'app.
              </p>
            </div>
          </div>

          {/* 4 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              4. Assistente Virtuale AI ("Rolly")
            </h3>
            <p className="text-slate-600 leading-relaxed">
              ViaCamper integra l'assistente virtuale Rolly, operato tramite modelli di intelligenza artificiale generativa (Google Gemini API).
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Le risposte fornite da Rolly sono generate automaticamente e possono contenere imprecisioni, inesattezze o dati non aggiornati;</li>
              <li>I contenuti elaborati da Rolly non costituiscono in alcun caso pareri legali, professionali, di sicurezza stradale o vincolanti;</li>
              <li>L'utente è tenuto a verificare in modo indipendente le informazioni critiche (es. accessibilità strade, passi montani, normative sulla sosta libera o transito) fornite dall'assistente prima di intraprendere il viaggio.</li>
            </ul>
          </div>

          {/* 5 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              5. Proprietà Intellettuale e Licenze di Terze Parti
            </h3>
            <p className="text-slate-600 leading-relaxed">
              L'applicazione ViaCamper, compresi il codice sorgente, le architetture software, gli algoritmi di calcolo della rotta e sagomatura, l'interfaccia utente (UI/UX), il marchio, il logo e la veste grafica, è di proprietà esclusiva di <strong>ViaCamper nella persona di Simone Sambucci</strong> ed è tutelata dalle leggi sul diritto d'autore (Legge 633/1941 e successive modifiche) e dalla proprietà industriale. È vietata qualsiasi decompilazione, reverse engineering, copia o redistribuzione non autorizzata.
            </p>
            <p className="text-slate-600 leading-relaxed font-semibold">
              I servizi di terze parti integrati sono utilizzati nel rispetto delle relative licenze:
            </p>
            <ul className="space-y-1 text-slate-600 pl-2">
              <li>• <strong>Google Maps Platform & Google Places API:</strong> © Google LLC. Dati di ricerca punti di interesse, mappe ed elenchi;</li>
              <li>• <strong>OpenStreetMap (OSM) & Overpass API:</strong> © Contributori OpenStreetMap, dati distribuiti sotto licenza Open Database License (ODbL);</li>
              <li>• <strong>Google Gemini AI:</strong> Servizi di intelligenza artificiale forniti da Google LLC;</li>
              <li>• <strong>Audio & Streaming:</strong> I brani musicali dimostrativi sono ospitati tramite SoundHelix (soundhelix.com). I flussi radiofonici appartengono ai rispettivi editori e licenzianti.</li>
            </ul>
          </div>

          {/* 6 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              6. Contenuti Generati dall'Utente (UGC) e Licenza d'Uso
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Caricando o inviando contenuti all'interno dell'applicazione ViaCamper (inclusi: recensioni, votazioni, fotografie, diari di bordo, segnalazioni di tappe o post nel forum/community):
            </p>
            <ul className="space-y-1.5 text-slate-600 pl-2">
              <li>• L'utente mantiene la titolarità della paternità morale dei propri contenuti;</li>
              <li>• L'utente concede al Titolare (ViaCamper nella persona di Simone Sambucci) una licenza d'uso non esclusiva, gratuita, perpetua, irrevocabile, trasferibile e valida in tutto il mondo per memorizzare, riprodurre, pubblicare, distribuire, adattare, mostrare e promuovere tali contenuti all'interno dell'app, del sito web e dei canali di comunicazione collegati a ViaCamper;</li>
              <li>• L'utente garantisce di essere il legittimo titolare dei diritti sui contenuti inviati e che essi non violano diritti di terzi o norme di legge, manlevando il Titolare da qualsiasi pretesa risarcitoria;</li>
              <li>• Il Titolare si riserva il diritto insindacabile di rimuovere o modificare, senza preavviso, qualsiasi contenuto ritenuto inappropriato, inesatto, offensivo o contrario alle regole della piattaforma.</li>
            </ul>
          </div>

          {/* 7 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              7. Regole di Uso Accettabile
            </h3>
            <p className="text-slate-600 leading-relaxed">
              È severamente fatto divieto all'utente di:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
              <li>Utilizzare script o sistemi automatizzati per estrarre dati dal servizio;</li>
              <li>Superare o tentare di aggirare i limiti di frequenza delle chiamate API (rate limit) o le misure di sicurezza del server;</li>
              <li>Rivedere, rivendere o commercializzare i contenuti o i dati integrati nell'app senza autorizzazione scritta.</li>
            </ul>
          </div>

          {/* 8 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              8. Esclusione di Garanzia e Limitazione di Responsabilità
            </h3>
            <p className="text-slate-600 leading-relaxed">
              Il servizio ViaCamper è fornito «così com'è» ("AS IS") e «come disponibile», senza garanzie di alcun tipo, esplicite o implicite. Nei limiti massimi consentiti dalla legge italiana, il Titolare <strong>ViaCamper nella persona di Simone Sambucci</strong> non risponderà di alcun danno diretto, indiretto, incidentale o consequenziale (inclusi a titolo esemplificativo: perdita di tempo, ritardi di viaggio, spese di parcheggio o traino, sanzioni stradali o mancata fruizione di strutture) derivante dall'uso o dall'impossibilità di utilizzare l'applicazione.
            </p>
          </div>

          {/* 9 */}
          <div className="space-y-2 bg-stone-50/60 p-4 rounded-xl border border-stone-100">
            <h3 className="font-extrabold text-[#1E3A6E] text-sm">
              9. Legge Applicabile e Foro Competente
            </h3>
            <p className="text-slate-600 leading-relaxed">
              I presenti Termini di Servizio sono regolati e interpretati esclusivamente in conformità alla legislazione italiana. Per qualsiasi controversia inerente all'interpretazione, esecuzione o validità del presente contratto, sarà competente in via esclusiva il Foro del luogo di residenza del Titolare (<strong>ViaCamper nella persona di Simone Sambucci</strong>), fatte salve le disposizioni inderogabili a tutela dei consumatori.
            </p>
          </div>
        </section>

        {/* PARTE II */}
        <section className="space-y-5 pt-4">
          <div className="border-b-2 border-emerald-700 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
              PARTE II
            </span>
            <h2 className="text-lg font-black text-emerald-800 mt-1">
              INFORMATIVA SULLA PRIVACY (GDPR UE 2016/679)
            </h2>
          </div>

          {/* 1 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              1. Titolare del Trattamento dei Dati
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Il Titolare del trattamento dei dati personali è <strong>ViaCamper nella persona di Simone Sambucci</strong>.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Contatto e-mail dedicato alla Privacy e alle comunicazioni legali:{" "}
              <a href="mailto:viacamperapp@gmail.com" className="text-blue-600 font-bold hover:underline">
                viacamperapp@gmail.com
              </a>
            </p>
          </div>

          {/* 2 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              2. Categorie di Dati Personali Raccolti
            </h3>
            <p className="text-slate-700 leading-relaxed">
              ViaCamper raccoglie e tratta le seguenti tipologie di dati personali:
            </p>
            <ul className="space-y-2 text-slate-700 pl-2">
              <li>• <strong>Dati di Account e Profilo:</strong> Indirizzo e-mail, nome utente, preferenze di viaggio e dati tecnici del veicolo (es. altezza, peso, lunghezza del camper) inseriti dall'utente;</li>
              <li>• <strong>Dati di Geolocalizzazione:</strong> Posizione GPS rilevata dal dispositivo (in tempo reale, approssimativa o precisa) previo consenso dell'utente, usata per mostrare punti d'interesse nelle vicinanze, calcolare rotte ed alimentare il diario di bordo;</li>
              <li>• <strong>Interazioni con Assistente AI (Rolly):</strong> Testo delle richieste, domande inviate e contesto di ricerca necessario alla generazione della risposta;</li>
              <li>• <strong>Contenuti Utente (UGC):</strong> Foto, recensioni, valutazioni e resoconti del diario di bordo. I metadati di geolocalizzazione (EXIF) presenti nelle fotografie vengono automaticamente rimossi prima della pubblicazione;</li>
              <li>• <strong>Dati Tecnici e di Utilizzo:</strong> Indirizzo IP, identificatori tecnici del dispositivo, sistema operativo, versione dell'app e log di sistema per finalità di sicurezza e diagnostica crash.</li>
            </ul>
          </div>

          {/* 3 */}
          <div className="space-y-3 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              3. Finalità e Basi Giuridiche del Trattamento
            </h3>
            
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#1E3A6E] text-white font-extrabold">
                  <tr>
                    <th className="p-3 w-1/2">Finalità del Trattamento</th>
                    <th className="p-3 w-1/2">Base Giuridica (GDPR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  <tr className="bg-white">
                    <td className="p-3 font-medium">Erogazione delle funzionalità dell'app (ricerca areasosta, diario di bordo, account utente)</td>
                    <td className="p-3 text-slate-600">Esecuzione del contratto (Art. 6.1.b GDPR)</td>
                  </tr>
                  <tr className="bg-stone-50">
                    <td className="p-3 font-medium">Rilevamento della posizione GPS (navigazione e ricerca tappe vicine)</td>
                    <td className="p-3 text-slate-600">Consenso esplicito dell'utente (Art. 6.1.a GDPR) — revocabile dalle impostazioni del dispositivo</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-medium">Elaborazione risposte dell'assistente AI Rolly</td>
                    <td className="p-3 text-slate-600">Esecuzione del contratto (Art. 6.1.b GDPR) e legittimo interesse al miglioramento dei servizi (Art. 6.1.f)</td>
                  </tr>
                  <tr className="bg-stone-50">
                    <td className="p-3 font-medium">Sicurezza della piattaforma, prevenzione frodi, abusi ed attacchi informatici</td>
                    <td className="p-3 text-slate-600">Legittimo interesse del Titolare (Art. 6.1.f GDPR)</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="p-3 font-medium">Adempimento di obblighi di legge o richieste delle Autorità competenti</td>
                    <td className="p-3 text-slate-600">Obbligo legale (Art. 6.1.c GDPR)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              4. Gestione della Geolocalizzazione e Posizione in Background
            </h3>
            <p className="text-slate-700 leading-relaxed">
              L'accesso ai dati di geolocalizzazione avviene esclusivamente previa autorizzazione concessa dall'utente tramite i permessi nativi del sistema operativo (iOS o Android):
            </p>
            <ul className="space-y-1.5 text-slate-700 pl-2">
              <li>• <strong>Posizione in Primo Piano:</strong> Utilizzata per posizionare l'utente sulla mappa, calcolare le distanze dai campeggi ed allertare per eventuali ostacoli sulla sagoma del veicolo;</li>
              <li>• <strong>Posizione in Background:</strong> Richiesta unicamente laddove l'utente attivi la registrazione continua del diario di viaggio. Può essere disattivata in qualsiasi momento dalle impostazioni di sistema del dispositivo senza pregiudicare la fruizione base dell'app. Le coordinate memorizzate nel diario sono protette da cifratura.</li>
            </ul>
          </div>

          {/* 5 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              5. Trattamento Dati nell'Assistente AI ("Rolly")
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Per erogare le risposte vocali e testuali dell'assistente Rolly, i quesiti inviati dall'utente vengono elaborati tramite l'infrastruttura di intelligenza artificiale Google Gemini API (operata da Google LLC):
            </p>
            <ul className="space-y-1 text-slate-700 pl-2">
              <li>• <strong>Dati inviati:</strong> Esclusivamente il testo del quesito e il contesto geografico approssimativo necessario a rispondere (es. città o zona di ricerca);</li>
              <li>• <strong>Dati NON inviati:</strong> Nome, cognome, e-mail, password, foto personali o contenuti riservati del diario di bordo non sono mai trasmessi ai modelli di IA;</li>
              <li>• <strong>Cronologia:</strong> L'utente ha la facoltà di cancellare lo storico delle conversazioni con Rolly direttamente dalle opzioni interne dell'applicazione.</li>
            </ul>
          </div>

          {/* 6 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              6. Cookie, Storage Locale e Tracciamento
            </h3>
            <p className="text-slate-700 leading-relaxed">
              ViaCamper non utilizza cookie di profilazione pubblicitaria né strumenti di tracciamento commerciale di terze parti. L'applicazione si avvale unicamente di meccanismi di memorizzazione tecnica locale (localStorage / SharedPreferences) indispensabili per salvare le preferenze dell'utente (es. unità di misura, dati veicolo) e mantenere attiva la sessione o la cache offline delle mappe.
            </p>
          </div>

          {/* 7 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              7. Destinatari dei Dati e Fornitori di Servizi (Responsabili)
            </h3>
            <p className="text-slate-700 leading-relaxed">
              I dati personali raccolti potranno essere trattati dai seguenti soggetti terzi, operanti in qualità di responsabili o autonomi titolari:
            </p>
            <ul className="space-y-1 text-slate-700 pl-2">
              <li>• <strong>Google Firebase / Cloud Firestore (Google LLC):</strong> Infrastruttura cloud protetta per il salvataggio dei dati dell'account e del diario di bordo;</li>
              <li>• <strong>Google LLC (Gemini API & Maps API):</strong> Fornitore dei servizi cartografici e di intelligenza artificiale per l'assistente Rolly;</li>
              <li>• <strong>Apple Inc. e Google LLC:</strong> Gestori degli store digitali (App Store e Google Play) per la distribuzione dell'applicazione e la gestione tecnica dei crash log.</li>
            </ul>
          </div>

          {/* 8 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              8. Trasferimento dei Dati Extra-UE
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Alcuni dei fornitori tecnologici sopra indicati (es. Google LLC) hanno sede o infrastrutture situate negli Stati Uniti d'America. Il trasferimento dei dati al di fuori dello Spazio Economico Europeo (SEE) avviene in piena conformità alle garanzie previste dal GDPR, mediante l'adozione delle Clausole Contrattuali Standard (Standard Contractual Clauses - SCC) approvate dalla Commissione Europea e la certificazione sotto l'EU-U.S. Data Privacy Framework.
            </p>
          </div>

          {/* 9 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              9. Periodo di Conservazione dei Dati
            </h3>
            <ul className="space-y-1.5 text-slate-700 pl-2">
              <li>• <strong>Dati dell'Account:</strong> Conservati per tutta la durata dell'account attivo e cancellati entro 30 giorni dalla richiesta di eliminazione dell'account;</li>
              <li>• <strong>Diario di Bordo e Tracce GPS:</strong> Mantenuti finché l'utente li conserva nell'app; eliminati immediatamente a seguito di cancellazione da parte dell'utente o eliminazione dell'account;</li>
              <li>• <strong>Conversazioni con Rolly AI:</strong> Conservate nei sistemi per un periodo massimo di 90 giorni per ragioni di diagnostica e sicurezza, salvo cancellazione manuale anticipata;</li>
              <li>• <strong>Log di Sicurezza:</strong> Trattenuti per un periodo massimo di 12 mesi per esigenze di difesa da attacchi informatici.</li>
            </ul>
          </div>

          {/* 10 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              10. Diritti dell'Interessato e Diritto all'Oblio
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Ai sensi degli Artt. 15-22 del Regolamento UE 2016/679 (GDPR), l'utente ha il diritto in qualsiasi momento di esercitare i seguenti diritti:
            </p>
            <ul className="space-y-1 text-slate-700 pl-2">
              <li>• <strong>Accesso e Rettifica:</strong> Verificare i propri dati personali e chiederne la correzione o l'aggiornamento;</li>
              <li>• <strong>Cancellazione (Diritto all'Oblio - Art. 17 GDPR):</strong> Richiedere la cancellazione definitiva dei propri dati personali e del proprio account;</li>
              <li>• <strong>Limitazione e Opposizione:</strong> Opporsi al trattamento o chiederne la limitazione nei casi previsti dalla legge;</li>
              <li>• <strong>Portabilità dei Dati:</strong> Ricevere una copia dei propri dati personali in un formato strutturato e di uso comune (es. JSON o CSV);</li>
              <li>• <strong>Revoca del Consenso:</strong> Revocare in qualsiasi momento il consenso precedentemente prestato per la geolocalizzazione;</li>
              <li>• <strong>Reclamo:</strong> Proporre reclamo formale all'Autorità Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">www.garanteprivacy.it</a>).</li>
            </ul>
            <p className="text-slate-700 leading-relaxed pt-1">
              Per esercitare un qualsiasi diritto, l'utente può inviare una richiesta formale via e-mail all'indirizzo:{" "}
              <a href="mailto:viacamperapp@gmail.com" className="text-blue-600 font-bold hover:underline">
                viacamperapp@gmail.com
              </a>. Il Titolare fornirà riscontro entro il termine di 30 giorni.
            </p>
          </div>

          {/* 11 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              11. Misure di Sicurezza
            </h3>
            <p className="text-slate-700 leading-relaxed">
              I dati personali sono protetti tramite idonee misure di sicurezza tecniche e organizzative, incluse la cifratura delle comunicazioni in transito (HTTPS/TLS), la cifratura dei dati a riposo nei database Firebase, il controllo degli accessi su base strictly need-to-know e procedure di backup periodico.
            </p>
          </div>

          {/* 12 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              12. Minori di Età
            </h3>
            <p className="text-slate-700 leading-relaxed">
              L'applicazione ViaCamper non è destinata all'uso da parte di minori di anni 14. Il Titolare non raccoglie consapevolmente dati personali relativi ai minori di 14 anni. Qualora un genitore o tutore dovesse riscontrare l'inserimento di dati da parte di un minore, è invitato a contattare tempestivamente il Titolare all'indirizzo{" "}
              <a href="mailto:viacamperapp@gmail.com" className="text-blue-600 font-bold hover:underline">
                viacamperapp@gmail.com
              </a>{" "}
              per richiederne la rimozione immediata.
            </p>
          </div>

          {/* 13 */}
          <div className="space-y-2 bg-emerald-50/30 p-4 rounded-xl border border-emerald-100">
            <h3 className="font-extrabold text-emerald-900 text-sm">
              13. Modifiche ai Termini e alla Privacy Policy
            </h3>
            <p className="text-slate-700 leading-relaxed">
              Il Titolare si riserva il diritto di apportare modifiche o aggiornamenti ai presenti Termini e alla Privacy Policy per adeguarli a novità legislative o evoluzioni tecniche dell'applicazione ViaCamper. La versione aggiornata sarà sempre consultabile all'interno dell'app e sui canali ufficiali. Gli utenti saranno informati di modifiche sostanziali tramite notifica in-app o e-mail.
            </p>
          </div>
        </section>
      </div>

      {/* Acceptance Box & Action Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
          <input
            type="checkbox"
            id="terms_acceptance"
            checked={hasAcceptedTerms}
            onChange={(e) => onToggleAcceptance(e.target.checked)}
            className="w-5 h-5 accent-[#3E4A35] cursor-pointer"
          />
          <label
            htmlFor="terms_acceptance"
            className="text-xs font-bold text-slate-800 cursor-pointer leading-snug"
          >
            Dichiaro di aver letto, compreso e accettato integralmente i Termini e Condizioni di Servizio, l'Informativa Privacy (GDPR UE 2016/679) e la Licenza d'Uso del software ViaCamper.
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
            className="py-3 px-4 bg-[#1E3A6E] hover:bg-[#2A4B82] active:scale-95 text-white rounded-xl text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>{downloadingPdf ? "Generazione in corso..." : "Scarica Regolamento PDF Completo"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(fullTextToCopy);
              window.dispatchEvent(
                new CustomEvent("show-toast", {
                  detail: {
                    message: "📋 Copiato il testo integrale di Termini & Privacy Policy!",
                  },
                })
              );
            }}
            className="py-3 px-4 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-extrabold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4 text-stone-600" />
            <span>Copia Testo Integrale negli Appunti</span>
          </button>
        </div>
      </div>
    </div>
  );
};
