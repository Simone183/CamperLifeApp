// Rolly AI Automated Moderation Utility for CamperLife App

const PROFANITY_REGEX_PATTERNS = [
  /\bcass?o\b/gi,
  /\bcazz[oiaewu]?\b/gi,
  /\bcazzat[ae]\b/gi,
  /\bcazzon[ei]\b/gi,
  /\bstronz[oiaewu]?\b/gi,
  /\bstronzat[ae]\b/gi,
  /\bmerd[ae]\b/gi,
  /\bmerdos[oa]?\b/gi,
  /\bvaffancul[oi]?\b/gi,
  /\bfancul[oi]?\b/gi,
  /\bcoglion[eiau]?\b/gi,
  /\brompicoglion[ei]?\b/gi,
  /\bbastard[oiaewu]?\b/gi,
  /\btroi[ae]\b/gi,
  /\bputtan[ae]\b/gi,
  /\bminchi[ae]\b/gi,
  /\bporc[oiaewu]?\b/gi,
  /\bschifos[oiaewu]?\b/gi,
  /\bcretin[oiaewu]?\b/gi,
  /\bdeficient[ei]\b/gi,
  /\bimbecill[ei]\b/gi,
  /\bfott[oietu]?\b/gi,
  /\bfottut[oiaewu]?\b/gi,
  /\bterron[ei]?\b/gi,
  /\bpolenton[ei]?\b/gi,
];

export interface ModerationResult {
  cleanText: string;
  hasProfanity: boolean;
  badWordsCount: number;
}

/**
 * Checks text for profanity and censors bad words with asterisks.
 */
export function moderateText(text: string): ModerationResult {
  if (!text) {
    return { cleanText: '', hasProfanity: false, badWordsCount: 0 };
  }

  let cleanText = text;
  let badWordsCount = 0;

  for (const pattern of PROFANITY_REGEX_PATTERNS) {
    const matches = cleanText.match(pattern);
    if (matches) {
      badWordsCount += matches.length;
      cleanText = cleanText.replace(pattern, (match) => {
        if (match.length <= 2) return '**';
        return match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
      });
    }
  }

  return {
    cleanText,
    hasProfanity: badWordsCount > 0,
    badWordsCount,
  };
}

/**
 * Generates an automated moderation warning from Rolly for the offending user.
 */
export function getRollyWarningText(username: string, contextType: 'chat' | 'social' | 'forum' | 'reply'): string {
  const cleanUser = username.replace(' (Camperista)', '');
  
  switch (contextType) {
    case 'chat':
      return `⚠️ Richiamo di Moderazione Rolly: @${cleanUser}, per favore mantieni un linguaggio educato ed esente da turpiloquio nella Live Chat CamperLife! I termini inopportuni sono stati censurati.`;
    case 'forum':
      return `⚠️ Richiamo di Moderazione Rolly: @${cleanUser}, ti ricordiamo che la sezione Forum richiede un linguaggio consono e rispettoso. I termini non adeguati sono stati censurati automaticamente.`;
    case 'reply':
      return `⚠️ Richiamo di Moderazione Rolly: @${cleanUser}, usa un tono adeguato ed evita parolacce nelle risposte della community.`;
    case 'social':
    default:
      return `⚠️ Richiamo di Moderazione Rolly: @${cleanUser}, ti invitiamo a rispettare il regolamento della community evitando parolacce o insulti. Il post è stato censurato dal sistema di moderazione IA.`;
  }
}
