export interface SEOProps {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  canonicalUrl?: string;
  publishedAt?: Date;
  updatedAt?: Date;
  author?: string;
  noindex?: boolean;
}

export function buildTitle(pageTitle?: string): string {
  const siteName = '信光（Sinko）';
  if (!pageTitle) return `${siteName} - 新興宗教をめぐる論点整理・調査報道メディア`;
  return `${pageTitle} | ${siteName}`;
}

export function buildJsonLdWebSite(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '信光（Sinko）',
    alternateName: 'Sinko',
    url: 'https://sinko.jp',
    description: '新興宗教をめぐる論点整理・社会背景・制度・報道・証言・二次被害防止を扱う調査報道メディア',
    publisher: {
      '@type': 'Organization',
      name: '信光編集部',
      url: 'https://sinko.jp',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://sinko.jp/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildJsonLdArticle(props: {
  title: string;
  description: string;
  url: string;
  publishedAt: Date;
  updatedAt?: Date;
  author: string;
  ogImage?: string;
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: props.title,
    description: props.description,
    url: props.url,
    datePublished: props.publishedAt.toISOString(),
    dateModified: (props.updatedAt ?? props.publishedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: props.author,
    },
    publisher: {
      '@type': 'Organization',
      name: '信光編集部',
      url: 'https://sinko.jp',
    },
    ...(props.ogImage && { image: props.ogImage }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': props.url,
    },
  };
}

export function buildJsonLdBreadcrumb(
  items: { name: string; url: string }[]
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildJsonLdFAQ(
  items: { question: string; answer: string }[]
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
