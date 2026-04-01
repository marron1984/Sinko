export type CategoryId =
  | 'basics'
  | 'social-issues'
  | 'law-and-systems'
  | 'family-and-survivors'
  | 'media-analysis'
  | 'history'
  | 'support';

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  slug: string;
}

export const categories: Category[] = [
  {
    id: 'basics',
    name: '基礎知識',
    description: 'カルト・新興宗教の定義、見分け方、歴史的背景など、基本的な知識を整理します。',
    slug: 'basics',
  },
  {
    id: 'social-issues',
    name: '社会問題',
    description: '被害事例、裁判、行政対応など、社会問題としての側面を報道・資料に基づいて整理します。',
    slug: 'social-issues',
  },
  {
    id: 'law-and-systems',
    name: '制度・法律',
    description: '宗教法人法、消費者保護法、信教の自由など、関連する法制度を解説します。',
    slug: 'law-and-systems',
  },
  {
    id: 'family-and-survivors',
    name: '家族・当事者',
    description: '脱会支援、家族問題、宗教二世問題など、当事者・家族視点の情報を整理します。',
    slug: 'family-and-survivors',
  },
  {
    id: 'media-analysis',
    name: '報道・検証',
    description: '報道の検証、メディア報道の分析など、情報の信頼性を検討します。',
    slug: 'media-analysis',
  },
  {
    id: 'history',
    name: '歴史・年表',
    description: '歴史的経緯、年表、アーカイブなど、時系列で出来事を整理します。',
    slug: 'history',
  },
  {
    id: 'support',
    name: '支援・相談',
    description: '相談窓口、支援団体、回復プログラムなど、具体的な支援情報をまとめます。',
    slug: 'support',
  },
];

export function getCategoryById(id: CategoryId): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
