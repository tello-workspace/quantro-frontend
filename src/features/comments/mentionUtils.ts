// src/features/comments/mentionUtils.ts
// @Mention otomatik tamamlama: metnin SONUNDAKI "@kelime" parcasini yakalar.
// TaskModal.tsx > CommentsSection'dan test edilebilmesi icin cikarildi.

const MENTION_TOKEN_RE = /@([\wÀ-ÖØ-öø-ÿĞğİıŞşÇçÖöÜü]*)$/;

export interface MentionCandidateSource {
  user: { id: string; name: string };
}

// Metnin sonunda acik bir "@..." varsa sorguyu (kucuk harfe cevrilmis) doner,
// yoksa null - null, oneri kutusunun hic gosterilmemesi gerektigi anlamina gelir.
export function extractMentionQuery(text: string): string | null {
  const match = MENTION_TOKEN_RE.exec(text);
  return match?.[1]?.toLowerCase() ?? null;
}

export function filterMentionCandidates<T extends MentionCandidateSource>(
  members: T[],
  query: string,
  limit = 5,
): T[] {
  return members.filter((m) => m.user.name.toLowerCase().includes(query)).slice(0, limit);
}

// Sondaki "@kelime" parcasini secilen ismin tamamiyla degistirir (sonuna
// bosluk eklenir ki kullanici direkt yazmaya devam edebilsin).
export function insertMention(text: string, name: string): string {
  return text.replace(MENTION_TOKEN_RE, `@${name} `);
}
