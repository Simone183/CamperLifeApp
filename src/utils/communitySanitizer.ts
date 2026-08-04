import { CommunityMessage } from '../types';

export const FAKE_USERS = new Set([
  'Marco_Van78', 'Elena_Camper91', 'Simo_FamilyOnRoad', 'BeppeVan', 'TechCamper_Luca',
  'Valeria_Coast', 'Pietro_Anto', 'Stefano_Oasi', 'Roberto_Mansardato', 'Giada_Van',
  'Silvia_NORD', 'Davide_Giramondo', 'Mia_E_CaneToby', 'GreenVan_Piero',
  'MeccanicoFaidate_Giuseppe', 'ChefInViaggio_Chiara', 'Andrea_Vento', 'Giancarlo_Pioneer',
  'OfficinaCamper_Rino', 'NomadFamily_Ilaria', 'Bruno_CamperSicuro'
]);

export const FAKE_POST_IDS = new Set([
  "m1", "m2", "m3", "m4", "social_post_1", "social_post_2", "social_post_3", "social_post_4", "chat_1", "chat_2"
]);

export function sanitizeCommunityMessage(msg: any): CommunityMessage | null {
  if (!msg) return null;
  const msgId = msg.id || "";
  const msgUser = msg.user || "";

  // Reject old fake user posts and old fake post IDs
  if (FAKE_POST_IDS.has(msgId) || FAKE_USERS.has(msgUser)) {
    return null;
  }

  const isInitialRolly = msgUser.includes("Rolly") || msgId.startsWith("rolly_topic_") || msgId.startsWith("social_post_rolly") || msgId.startsWith("chat_rolly");

  // Filter out any fake replies (by ID pattern or by author name)
  const rawReplies = Array.isArray(msg.replies) ? msg.replies : [];
  const cleanReplies = rawReplies.filter((r: any) => {
    if (!r) return false;
    if (r.id && (r.id.startsWith("r_r") || r.id.startsWith("r_soc") || r.id.startsWith("r_chat"))) return false;
    if (r.user && FAKE_USERS.has(r.user)) return false;
    return true;
  });

  // Ensure fake likes are reset to 0 (or 1 if current user liked)
  let likes = Number(msg.likes) || 0;
  if (isInitialRolly) {
    likes = msg.likedByCurrentUser ? 1 : 0;
  }

  const msgType = msg.type || (msgId.startsWith("chat_") ? "chat" : "forum");

  return {
    ...msg,
    type: msgType,
    likes,
    replies: cleanReplies
  };
}

export function sanitizeCommunityMessagesList(messages: any[]): CommunityMessage[] {
  if (!Array.isArray(messages)) return [];
  const result: CommunityMessage[] = [];
  for (const item of messages) {
    const sanitized = sanitizeCommunityMessage(item);
    if (sanitized) {
      result.push(sanitized);
    }
  }
  return result;
}
