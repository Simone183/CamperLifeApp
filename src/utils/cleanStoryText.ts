/**
 * Utility to clean travel diary / OCR story text:
 * 1. Removes introductory AI preamble phrases (e.g., "Ecco la trascrizione fedele...", "Ecco il resoconto...", etc.)
 * 2. Removes all asterisks (*, **, ***) used for markdown formatting or bullets
 * 3. Removes / replaces arrows (->, =>, ➔, →, etc.) with clean natural punctuation
 * 4. Removes markdown boilerplate headers, quotes (> ), dividers (---)
 * 5. Cleans extra whitespaces while preserving natural paragraphs
 */
export function cleanTravelStoryText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let text = rawText;

  // 1. Remove multiline introductory sentences / AI preambles
  // E.g.: "Ecco la trascrizione fedele del diario di bordo manoscritto, formattata ed editata con cura per il resoconto di viaggio di\n**ViaCamper**:"
  text = text.replace(
    /^[ \t]*Ecco la trascrizione fedele del diario di bordo manoscritto[\s\S]*?(?:(?:\*{1,2})?ViaCamper(?:\*{1,2})?:?)[ \t]*\n*/i,
    ""
  );

  text = text.replace(
    /^[ \t]*Ecco la trascrizione fedele del diario di bordo manoscritto[^\n]*:?[ \t]*\n*/gim,
    ""
  );

  text = text.replace(
    /^[ \t]*Ecco la trascrizione fedele del testo presente nell['’]immagine[\s\S]*?(?:camperista\.?)[ \t]*\n*/i,
    ""
  );

  text = text.replace(
    /^[ \t]*Ecco la trascrizione[^\n]*:?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*Ecco il resoconto[^\n]*:?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*Ecco il racconto[^\n]*:?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*Ecco il diario[^\n]*:?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*Ecco il testo[^\n]*:?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*Ecco gli appunti[^\n]*:?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*Ecco una rielaborazione[^\n]*:?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*Certamente[!,.:][^\n]*\n*/gim,
    ""
  );

  // Remove specific ViaCamper boilerplate phrases if present
  text = text.replace(
    /^[ \t]*(?:#+[ \t]*)?Il Diario di Viaggio di ViaCamper[^\n]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*\*?Pronto da salvare e stampare per il tuo archivio delle avventure in camper!?\*?[ \t]*\n*/gim,
    ""
  );
  text = text.replace(
    /^[ \t]*(?:#+[ \t]*)?Trascrizione fedele del testo manoscritto[^\n]*\n*/gim,
    ""
  );

  // Standalone "ViaCamper:" or "**ViaCamper**:" prefix if left
  text = text.replace(/^[ \t]*(?:\*{1,2})?ViaCamper(?:\*{1,2})?:?[ \t]*\n*/gim, "");

  // 2. Remove markdown horizontal dividers (---, ___, ***)
  text = text.replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, "");

  // 3. Remove markdown quote markers (> ) at beginning of lines
  text = text.replace(/^[ \t]*>[ \t]?/gm, "");

  // 4. Remove markdown header hashes (#, ##, ###, ####, etc.) at beginning of lines
  text = text.replace(/^[ \t]*#{1,6}[ \t]+/gm, "");

  // 5. Replace arrows with clean dashes (e.g., A -> B or A ➔ B becomes A - B)
  // Arrows: ->, -->, ==>, =>, ➔, →, ➜, ➤, ↔, ⇄, ◄, ►, <-, <--, ←
  text = text.replace(/[ \t]*(?:-->|->|==>|=>|➔|→|➜|➤|↔|⇄|◄|►|<--|<-|←)[ \t]*/g, " - ");

  // 6. Handle bullet lists starting with asterisk (* item) -> change to clean hyphen (- item)
  text = text.replace(/^[ \t]*\*[ \t]+/gm, "- ");

  // 7. Remove asterisks (*, **, ***) used for markdown formatting
  for (let i = 0; i < 3; i++) {
    text = text.replace(/\*{1,3}([^*\n]+?)\*{1,3}/g, "$1");
  }
  // Remove any remaining stray asterisks
  text = text.replace(/\*/g, "");

  // 8. Clean up consecutive dashes or spacing artifacts
  text = text.replace(/[ \t]+-[ \t]+-[ \t]+/g, " - ");
  text = text.replace(/^[ \t]+-[ \t]+-[ \t]+/gm, "- ");
  text = text.replace(/[ \t]+$/gm, ""); // trailing space on lines
  text = text.replace(/\n{3,}/g, "\n\n"); // collapse triple newlines to double

  return text.trim();
}
