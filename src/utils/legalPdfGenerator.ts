import { jsPDF } from "jspdf";

export const generateLegalPDF = (): void => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210
  const pageHeight = doc.internal.pageSize.getHeight(); // 297
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180
  let y = 15;

  // Colors
  const primaryColor = [30, 58, 110]; // #1E3A6E
  const headerBgColor = [15, 32, 67]; // Dark Navy Blue
  const textColor = [40, 40, 40];
  const mutedTextColor = [100, 100, 100];
  const boxBgColor = [245, 247, 250];
  const boxBorderColor = [220, 225, 235];

  const checkPageBreak = (neededHeight: number): void => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // --- PAGE 1 TOP BANNER ---
  doc.setFillColor(headerBgColor[0], headerBgColor[1], headerBgColor[2]);
  doc.rect(0, 0, pageWidth, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ViaCamper", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Termini e Condizioni di Servizio & Informativa sulla Privacy (GDPR UE 2016/679)",
    margin,
    20
  );

  y = 34;

  // --- INFO HEADER BOX ---
  doc.setFillColor(boxBgColor[0], boxBgColor[1], boxBgColor[2]);
  doc.setDrawColor(boxBorderColor[0], boxBorderColor[1], boxBorderColor[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, "FD");

  doc.setTextColor(30, 40, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Titolare dell'App, del Software e del Trattamento Dati:", margin + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text("ViaCamper nella persona di Simone Sambucci", margin + 78, y + 6);

  doc.setFont("helvetica", "bold");
  doc.text("Email di Contatto e Privacy:", margin + 4, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(37, 99, 235);
  doc.text("viacamperapp@gmail.com", margin + 46, y + 11);

  doc.setTextColor(30, 40, 60);
  doc.setFont("helvetica", "bold");
  doc.text("Ultimo aggiornamento:", margin + 4, y + 16);
  doc.setFont("helvetica", "normal");
  doc.text(
    "Agosto 2026 • Versione: 2.1 (Valida per App Mobile iOS / Android e Servizi Connessi)",
    margin + 38,
    y + 16
  );

  y += 30;

  // Helper for section headings
  const addMainSectionTitle = (title: string) => {
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title, margin, y);
    doc.setDrawColor(200, 210, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, margin + contentWidth, y + 2);
    y += 8;
  };

  const addNumberedTitle = (title: string) => {
    checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title, margin, y);
    y += 5;
  };

  const addParagraph = (text: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    const blockHeight = lines.length * 3.6;
    checkPageBreak(blockHeight);
    doc.text(lines, margin, y);
    y += blockHeight + 2.5;
  };

  const addBullet = (bulletTitle: string, bulletText: string) => {
    doc.setFontSize(8);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    const fullText = bulletTitle ? `${bulletTitle}: ${bulletText}` : bulletText;
    const lines = doc.splitTextToSize(fullText, contentWidth - 6);
    const blockHeight = lines.length * 3.6;
    checkPageBreak(blockHeight);

    doc.setFont("helvetica", "bold");
    doc.text("•", margin + 1, y);

    if (bulletTitle) {
      doc.setFont("helvetica", "bold");
      doc.text(`${bulletTitle}: `, margin + 5, y);
      const titleWidth = doc.getTextWidth(`${bulletTitle}: `);
      // first line remainder
      doc.setFont("helvetica", "normal");
      const restLines = doc.splitTextToSize(bulletText, contentWidth - 6);
      doc.text(restLines, margin + 5, y);
    } else {
      doc.setFont("helvetica", "normal");
      doc.text(lines, margin + 5, y);
    }
    y += blockHeight + 2;
  };

  // --- PARTE I ---
  addMainSectionTitle("PARTE I — TERMINI E CONDIZIONI DI SERVIZIO");

  addNumberedTitle("1. Oggetto del Servizio e Titolarietà");
  addParagraph(
    "ViaCamper è un'applicazione mobile e software proprietario privato concepito, sviluppato e gestito dal Titolare ViaCamper nella persona di Simone Sambucci. La piattaforma fornisce funzionalità dedicate al turismo itinerante, tra cui la mappatura e ricerca di aree di sosta camper, campeggi, punti d'interesse (POI), strumenti di navigazione e calcolo rotte personalizzate basate sulle dimensioni del veicolo (sagomato camper), diario di bordo digitale, nonché un assistente virtuale basato su intelligenza artificiale denominato \"Rolly\"."
  );
  addParagraph(
    "Utilizzando l'applicazione ViaCamper, l'utente dichiara di aver letto, compreso e accettato integralmente i presenti Termini di Servizio. Qualora l'utente non intenda accettare le presenti condizioni, è tenuto a non utilizzare l'applicazione."
  );

  addNumberedTitle("2. Account Utente e Sicurezza");
  addParagraph(
    "L'accesso a determinate funzionalità richiede la creazione di un account personale. L'utente si impegna a fornire informazioni veritiere, accurate e aggiornate (es. indirizzo e-mail valido e dimensioni reali del veicolo)."
  );
  addParagraph(
    "L'utente è l'unico responsabile della custodia e riservatezza delle proprie credenziali di accesso. Il Titolare (ViaCamper nella persona di Simone Sambucci) si riserva il diritto di sospendere o chiudere permanentemente l'account dell'utente in caso di:"
  );
  addBullet("", "Violazione dei presenti Termini o delle normative vigenti;");
  addBullet("", "Tentativi di estrazione massiva o automatizzata di dati (scraping non autorizzato);");
  addBullet("", "Uso improprio o abusivo dell'assistente AI Rolly;");
  addBullet("", "Pubblicazione di contenuti illegali, diffamatori, offensivi o lesivi di diritti terzi.");

  addNumberedTitle("3. Accuratezza dei Dati, Mappe e Limitazioni di Responsabilità sulla Navigazione");
  addParagraph(
    "Le informazioni sulle strutture di sosta, campeggi, servizi, restrizioni ed itinerari provengono da una combinazione di dati proprietari, contributi degli utenti (UGC) e API/banche dati di terze parti (tra cui OpenStreetMap e Google Places API). Sebbene il Titolare adotti ogni ragionevole misura per mantenere i dati aggiornati:"
  );
  addBullet(
    "Nessuna garanzia di completezza",
    "Non si garantisce l'assoluta esattezza, continuità o aggiornamento in tempo reale di orari, prezzi, tariffe, disponibilità o divieti locali. L'utente è tenuto a verificare preventivamente in loco o tramite i canali ufficiali della struttura;"
  );
  addBullet(
    "Navigazione e limiti sagoma camper",
    "I calcoli di percorso, i suggerimenti sulle rotte e gli avvisi relativi ai limiti di altezza, peso e larghezza del veicolo forniti da ViaCamper hanno carattere unicamente informativo, indicativo e ausiliario. Il conducente del veicolo rimane l'unico e insindacabile responsabile della condotta di guida, del rispetto del Codice della Strada e della segnaletica stradale verticale/orizzontale reale. Il Titolare declina ogni responsabilità per sanzioni amministrative (multe), danni al veicolo o inconvenienti di percorso derivanti dall'affidamento sulle indicazioni dell'app."
  );

  addNumberedTitle("4. Assistente Virtuale AI (\"Rolly\")");
  addParagraph(
    "ViaCamper integra l'assistente virtuale Rolly, operato tramite modelli di intelligenza artificiale generativa (Google Gemini API)."
  );
  addBullet("", "Le risposte fornite da Rolly sono generate automaticamente e possono contenere imprecisioni, inesattezze o dati non aggiornati;");
  addBullet("", "I contenuti elaborati da Rolly non costituiscono in alcun caso pareri legali, professionali, di sicurezza stradale o vincolanti;");
  addBullet("", "L'utente è tenuto a verificare in modo indipendente le informazioni critiche (es. accessibilità strade, passi montani, normative sulla sosta libera o transito) fornite dall'assistente prima di intraprendere il viaggio.");

  addNumberedTitle("5. Proprietà Intellettuale e Licenze di Terze Parti");
  addParagraph(
    "L'applicazione ViaCamper, compresi il codice sorgente, le architetture software, gli algoritmi di calcolo della rotta e sagomatura, l'interfaccia utente (UI/UX), il marchio, il logo e la veste grafica, è di proprietà esclusiva di ViaCamper nella persona di Simone Sambucci ed è tutelata dalle leggi sul diritto d'autore (Legge 633/1941 e successive modifiche) e dalla proprietà industriale. È vietata qualsiasi decompilazione, reverse engineering, copia o redistribuzione non autorizzata."
  );
  addParagraph("I servizi di terze parti integrati sono utilizzati nel rispetto delle relative licenze:");
  addBullet("Google Maps Platform & Google Places API", "© Google LLC. Dati di ricerca punti di interesse, mappe ed elenchi;");
  addBullet("OpenStreetMap (OSM) & Overpass API", "© Contributori OpenStreetMap, dati distribuiti sotto licenza Open Database License (ODbL);");
  addBullet("Google Gemini AI", "Servizi di intelligenza artificiale forniti da Google LLC;");
  addBullet("Audio & Streaming", "I brani musicali dimostrativi sono ospitati tramite SoundHelix (soundhelix.com). I flussi radiofonici appartengono ai rispettivi editori e licenzianti.");

  addNumberedTitle("6. Contenuti Generati dall'Utente (UGC) e Licenza d'Uso");
  addParagraph(
    "Caricando o inviando contenuti all'interno dell'applicazione ViaCamper (inclusi: recensioni, votazioni, fotografie, diari di bordo, segnalazioni di tappe o post nel forum/community):"
  );
  addBullet("", "L'utente mantiene la titolarità della paternità morale dei propri contenuti;");
  addBullet("", "L'utente concede al Titolare (ViaCamper nella persona di Simone Sambucci) una licenza d'uso non esclusiva, gratuita, perpetua, irrevocabile, trasferibile e valida in tutto il mondo per memorizzare, riprodurre, pubblicare, distribuire, adattare, mostrare e promuovere tali contenuti all'interno dell'app, del sito web e dei canali di comunicazione collegati a ViaCamper;");
  addBullet("", "L'utente garantisce di essere il legittimo titolare dei diritti sui contenuti inviati e che essi non violano diritti di terzi o norme di legge, manlevando il Titolare da qualsiasi pretesa risarcitoria;");
  addBullet("", "Il Titolare si riserva il diritto insindacabile di rimuovere o modificare, senza preavviso, qualsiasi contenuto ritenuto inappropriato, inesatto, offensivo o contrario alle regole della piattaforma.");

  addNumberedTitle("7. Regole di Uso Accettabile");
  addParagraph("È severamente fatto divieto all'utente di:");
  addBullet("", "Utilizzare script o sistemi automatizzati per estrarre dati dal servizio;");
  addBullet("", "Superare o tentare di aggirare i limiti di frequenza delle chiamate API (rate limit) o le misure di sicurezza del server;");
  addBullet("", "Rivedere, rivendere o commercializzare i contenuti o i dati integrati nell'app senza autorizzazione scritta.");

  addNumberedTitle("8. Esclusione di Garanzia e Limitazione di Responsabilità");
  addParagraph(
    "Il servizio ViaCamper è fornito «così com'è» (\"AS IS\") e «come disponibile», senza garanzie di alcun tipo, esplicite o implicite. Nei limiti massimi consentiti dalla legge italiana, il Titolare ViaCamper nella persona di Simone Sambucci non risponderà di alcun danno diretto, indiretto, incidentale o consequenziale (inclusi a titolo esemplificativo: perdita di tempo, ritardi di viaggio, spese di parcheggio o traino, sanzioni stradali o mancata fruizione di strutture) derivante dall'uso o dall'impossibilità di utilizzare l'applicazione."
  );

  addNumberedTitle("9. Legge Applicabile e Foro Competente");
  addParagraph(
    "I presenti Termini di Servizio sono regolati e interpretati esclusivamente in conformità alla legislazione italiana. Per qualsiasi controversia inerente all'interpretazione, esecuzione o validità del presente contratto, sarà competente in via esclusiva il Foro del luogo di residenza del Titolare (ViaCamper nella persona di Simone Sambucci), fatte salve le disposizioni inderogabili a tutela dei consumatori."
  );

  // --- PARTE II ---
  addMainSectionTitle("PARTE II — INFORMATIVA SULLA PRIVACY (GDPR UE 2016/679)");

  addNumberedTitle("1. Titolare del Trattamento dei Dati");
  addParagraph("Il Titolare del trattamento dei dati personali è ViaCamper nella persona di Simone Sambucci.");
  addParagraph("Contatto e-mail dedicato alla Privacy e alle comunicazioni legali: viacamperapp@gmail.com");

  addNumberedTitle("2. Categorie di Dati Personali Raccolti");
  addParagraph("ViaCamper raccoglie e tratta le seguenti tipologie di dati personali:");
  addBullet("Dati di Account e Profilo", "Indirizzo e-mail, nome utente, preferenze di viaggio e dati tecnici del veicolo (es. altezza, peso, lunghezza del camper) inseriti dall'utente;");
  addBullet("Dati di Geolocalizzazione", "Posizione GPS rilevata dal dispositivo (in tempo reale, approssimativa o precisa) previo consenso dell'utente, usata per mostrare punti d'interesse nelle vicinanze, calcolare rotte ed alimentare il diario di bordo;");
  addBullet("Interazioni con Assistente AI (Rolly)", "Testo delle richieste, domande inviate e contesto di ricerca necessario alla generazione della risposta;");
  addBullet("Contenuti Utente (UGC)", "Foto, recensioni, valutazioni e resoconti del diario di bordo. I metadati di geolocalizzazione (EXIF) presenti nelle fotografie vengono automaticamente rimossi prima della pubblicazione;");
  addBullet("Dati Tecnici e di Utilizzo", "Indirizzo IP, identificatori tecnici del dispositivo, sistema operativo, versione dell'app e log di sistema per finalità di sicurezza e diagnostica crash.");

  addNumberedTitle("3. Finalità e Basi Giuridiche del Trattamento");

  // Draw Table for GDPR Purposes
  const tableData = [
    [
      "Erogazione delle funzionalità dell'app (ricerca areasosta, diario di bordo, account utente)",
      "Esecuzione del contratto (Art. 6.1.b GDPR)",
    ],
    [
      "Rilevamento della posizione GPS (navigazione e ricerca tappe vicine)",
      "Consenso esplicito dell'utente (Art. 6.1.a GDPR) — revocabile dalle impostazioni del dispositivo",
    ],
    [
      "Elaborazione risposte dell'assistente AI Rolly",
      "Esecuzione del contratto (Art. 6.1.b GDPR) e legittimo interesse al miglioramento dei servizi (Art. 6.1.f)",
    ],
    [
      "Sicurezza della piattaforma, prevenzione frodi, abusi ed attacchi informatici",
      "Legittimo interesse del Titolare (Art. 6.1.f GDPR)",
    ],
    [
      "Adempimento di obblighi di legge o richieste delle Autorità competenti",
      "Obbligo legale (Art. 6.1.c GDPR)",
    ],
  ];

  checkPageBreak(50);
  doc.setFillColor(30, 58, 110);
  doc.rect(margin, y, contentWidth, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Finalità del Trattamento", margin + 3, y + 4.5);
  doc.text("Base Giuridica (GDPR)", margin + 98, y + 4.5);
  y += 7;

  tableData.forEach(([col1, col2], idx) => {
    const l1 = doc.splitTextToSize(col1, 92);
    const l2 = doc.splitTextToSize(col2, 82);
    const maxL = Math.max(l1.length, l2.length);
    const h = maxL * 3.5 + 3;

    checkPageBreak(h);

    if (idx % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, contentWidth, h, "F");
    }
    doc.setDrawColor(220, 225, 235);
    doc.rect(margin, y, contentWidth, h, "D");
    doc.line(margin + 95, y, margin + 95, y + h);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(30, 30, 30);
    doc.text(l1, margin + 3, y + 3.5);
    doc.text(l2, margin + 98, y + 3.5);

    y += h;
  });
  y += 4;

  addNumberedTitle("4. Gestione della Geolocalizzazione e Posizione in Background");
  addParagraph(
    "L'accesso ai dati di geolocalizzazione avviene esclusivamente previa autorizzazione concessa dall'utente tramite i permessi nativi del sistema operativo (iOS o Android):"
  );
  addBullet("Posizione in Primo Piano", "Utilizzata per posizionare l'utente sulla mappa, calcolare le distanze dai campeggi ed allertare per eventuali ostacoli sulla sagoma del veicolo;");
  addBullet("Posizione in Background", "Richiesta unicamente laddove l'utente attivi la registrazione continua del diario di viaggio. Può essere disattivata in qualsiasi momento dalle impostazioni di sistema del dispositivo senza pregiudicare la fruizione base dell'app. Le coordinate memorizzate nel diario sono protette da cifratura.");

  addNumberedTitle("5. Trattamento Dati nell'Assistente AI (\"Rolly\")");
  addParagraph(
    "Per erogare le risposte vocali e testuali dell'assistente Rolly, i quesiti inviati dall'utente vengono elaborati tramite l'infrastruttura di intelligenza artificiale Google Gemini API (operata da Google LLC):"
  );
  addBullet("Dati inviati", "Esclusivamente il testo del quesito e il contesto geografico approssimativo necessario a rispondere (es. città o zona di ricerca);");
  addBullet("Dati NON inviati", "Nome, cognome, e-mail, password, foto personali o contenuti riservati del diario di bordo non sono mai trasmessi ai modelli di IA;");
  addBullet("Cronologia", "L'utente ha la facoltà di cancellare lo storico delle conversazioni con Rolly direttamente dalle opzioni interne dell'applicazione.");

  addNumberedTitle("6. Cookie, Storage Locale e Tracciamento");
  addParagraph(
    "ViaCamper non utilizza cookie di profilazione pubblicitaria né strumenti di tracciamento commerciale di terze parti. L'applicazione si avvale unicamente di meccanismi di memorizzazione tecnica locale (localStorage / SharedPreferences) indispensabili per salvare le preferenze dell'utente (es. unità di misura, dati veicolo) e mantenere attiva la sessione o la cache offline delle mappe."
  );

  addNumberedTitle("7. Destinatari dei Dati e Fornitori di Servizi (Responsabili)");
  addParagraph(
    "I dati personali raccolti potranno essere trattati dai seguenti soggetti terzi, operanti in qualità di responsabili o autonomi titolari:"
  );
  addBullet("Google Firebase / Cloud Firestore (Google LLC)", "Infrastruttura cloud protetta per il salvataggio dei dati dell'account e del diario di bordo;");
  addBullet("Google LLC (Gemini API & Maps API)", "Fornitore dei servizi cartografici e di intelligenza artificiale per l'assistente Rolly;");
  addBullet("Apple Inc. e Google LLC", "Gestori degli store digitali (App Store e Google Play) per la distribuzione dell'applicazione e la gestione tecnica dei crash log.");

  addNumberedTitle("8. Trasferimento dei Dati Extra-UE");
  addParagraph(
    "Alcuni dei fornitori tecnologici sopra indicati (es. Google LLC) hanno sede o infrastrutture situate negli Stati Uniti d'America. Il trasferimento dei dati al di fuori dello Spazio Economico Europeo (SEE) avviene in piena conformità alle garanzie previste dal GDPR, mediante l'adozione delle Clausole Contrattuali Standard (Standard Contractual Clauses - SCC) approvate dalla Commissione Europea e la certificazione sotto l'EU-U.S. Data Privacy Framework."
  );

  addNumberedTitle("9. Periodo di Conservazione dei Dati");
  addBullet("Dati dell'Account", "Conservati per tutta la durata dell'account attivo e cancellati entro 30 giorni dalla richiesta di eliminazione dell'account;");
  addBullet("Diario di Bordo e Tracce GPS", "Mantenuti finché l'utente li conserva nell'app; eliminati immediatamente a seguito di cancellazione da parte dell'utente o eliminazione dell'account;");
  addBullet("Conversazioni con Rolly AI", "Conservate nei sistemi per un periodo massimo di 90 giorni per ragioni di diagnostica e sicurezza, salvo cancellazione manuale anticipata;");
  addBullet("Log di Sicurezza", "Trattenuti per un periodo massimo di 12 mesi per esigenze di difesa da attacchi informatici.");

  addNumberedTitle("10. Diritti dell'Interessato e Diritto all'Oblio");
  addParagraph(
    "Ai sensi degli Artt. 15-22 del Regolamento UE 2016/679 (GDPR), l'utente ha il diritto in qualsiasi momento di esercitare i seguenti diritti:"
  );
  addBullet("Accesso e Rettifica", "Verificare i propri dati personali e chiederne la correzione o l'aggiornamento;");
  addBullet("Cancellazione (Diritto all'Oblio - Art. 17 GDPR)", "Richiedere la cancellazione definitiva dei propri dati personali e del proprio account;");
  addBullet("Limitazione e Opposizione", "Opporsi al trattamento o chiederne la limitazione nei casi previsti dalla legge;");
  addBullet("Portabilità dei Dati", "Ricevere una copia dei propri dati personali in un formato strutturato e di uso comune (es. JSON o CSV);");
  addBullet("Revoca del Consenso", "Revocare in qualsiasi momento il consenso precedentemente prestato per la geolocalizzazione;");
  addBullet("Reclamo", "Proporre reclamo formale all'Autorità Garante per la Protezione dei Dati Personali (www.garanteprivacy.it).");
  addParagraph(
    "Per esercitare un qualsiasi diritto, l'utente può inviare una richiesta formale via e-mail all'indirizzo: viacamperapp@gmail.com. Il Titolare fornirà riscontro entro il termine di 30 giorni."
  );

  addNumberedTitle("11. Misure di Sicurezza");
  addParagraph(
    "I dati personali sono protetti tramite idonee misure di sicurezza tecniche e organizzative, incluse la cifratura delle comunicazioni in transito (HTTPS/TLS), la cifratura dei dati a riposo nei database Firebase, il controllo degli accessi su base strictly need-to-know e procedure di backup periodico."
  );

  addNumberedTitle("12. Minori di Età");
  addParagraph(
    "L'applicazione ViaCamper non è destinata all'uso da parte di minori di anni 14. Il Titolare non raccoglie consapevolmente dati personali relativi ai minori di 14 anni. Qualora un genitore o tutore dovesse riscontrare l'inserimento di dati da parte di un minore, è invitato a contattare tempestivamente il Titolare all'indirizzo viacamperapp@gmail.com per richiederne la rimozione immediata."
  );

  addNumberedTitle("13. Modifiche ai Termini e alla Privacy Policy");
  addParagraph(
    "Il Titolare si riserva il diritto di apportare modifiche o aggiornamenti ai presenti Termini e alla Privacy Policy per adeguarli a novità legislative o evoluzioni tecniche dell'applicazione ViaCamper. La versione aggiornata sarà sempre consultabile all'interno dell'app e sui canali ufficiali. Gli utenti saranno informati di modifiche sostanziali tramite notifica in-app o e-mail."
  );

  // --- FOOTERS & PAGE NUMBERS ---
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

    // Footer line
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12);

    doc.text(
      "ViaCamper — Termini di Servizio e Privacy Policy",
      margin,
      pageHeight - 7
    );
    doc.text(
      `Pagina ${i} di ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" }
    );
  }

  // Save the generated PDF
  doc.save("ViaCamper_Termini_e_Privacy_Policy_v2.1.pdf");
};
