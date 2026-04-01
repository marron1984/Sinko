/** 日付を日本語表記にフォーマット */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** 日付をISO形式にフォーマット */
export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** 読了時間を推定（日本語: 約500文字/分） */
export function estimateReadingTime(text: string): number {
  const charCount = text.replace(/\s/g, '').length;
  return Math.max(1, Math.ceil(charCount / 500));
}

/** slugを生成 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
