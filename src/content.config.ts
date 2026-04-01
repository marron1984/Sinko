import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/** 記事コンテンツ */
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    summary: z.array(z.string()).min(1).max(3),
    category: z.enum([
      'basics',
      'social-issues',
      'law-and-systems',
      'family-and-survivors',
      'media-analysis',
      'history',
      'support',
    ]),
    tags: z.array(z.string()).default([]),
    author: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    sources: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        url: z.string().url().optional(),
        accessedAt: z.string().optional(),
      })
    ).default([]),
    relatedArticles: z.array(z.string()).default([]),
    series: z.object({
      name: z.string(),
      order: z.number(),
    }).optional(),
    sensitive: z.boolean().default(false),
    legalReviewRequired: z.boolean().default(false),
    status: z.enum(['draft', 'review', 'published', 'archived']).default('published'),
    facts: z.array(z.string()).default([]),
    unverified: z.array(z.string()).default([]),
    editorNote: z.string().optional(),
    ogImage: z.string().optional(),
  }),
});

/** 著者 */
const authors = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    bio: z.string(),
    expertise: z.array(z.string()).default([]),
    links: z.array(z.object({
      label: z.string(),
      url: z.string().url(),
    })).default([]),
    avatar: z.string().optional(),
  }),
});

/** 用語集 */
const glossary = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/glossary' }),
  schema: z.object({
    term: z.string(),
    reading: z.string(),
    category: z.string(),
    relatedTerms: z.array(z.string()).default([]),
    sources: z.array(z.object({
      label: z.string(),
      url: z.string().url().optional(),
    })).default([]),
  }),
});

/** 年表イベント */
const timeline = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/timeline' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    sources: z.array(z.object({
      label: z.string(),
      url: z.string().url().optional(),
    })).default([]),
    significance: z.enum(['high', 'medium', 'low']).default('medium'),
  }),
});

/** FAQ */
const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: z.object({
    question: z.string(),
    category: z.string(),
    order: z.number().default(0),
    relatedArticles: z.array(z.string()).default([]),
  }),
});

/** 支援窓口 */
const support = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/support' }),
  schema: z.object({
    name: z.string(),
    category: z.enum(['legal', 'mental-health', 'family', 'general', 'government']),
    phone: z.string().optional(),
    url: z.string().url().optional(),
    hours: z.string().optional(),
    description: z.string(),
    isVerified: z.boolean().default(false),
    lastVerified: z.coerce.date().optional(),
  }),
});

/** 団体 */
const organizations = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/organizations' }),
  schema: z.object({
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    founded: z.string().optional(),
    category: z.string(),
    legalStatus: z.string().optional(),
    tags: z.array(z.string()).default([]),
    disclaimer: z.string().optional(),
  }),
});

export const collections = {
  articles,
  authors,
  glossary,
  timeline,
  faq,
  support,
  organizations,
};
