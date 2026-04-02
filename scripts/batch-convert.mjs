#!/usr/bin/env node
/**
 * batch-convert.mjs
 * Shinko-kiji の200記事を信光（Sinko）のAstro Content Collections形式に一括変換
 */
import fs from 'node:fs';
import path from 'node:path';

const INPUT_BASE = '/tmp/Shinko-kiji/articles';
const OUTPUT_BASE = '/home/user/Sinko/src/content/articles';

// ──────── カテゴリマッピング (10 → 7) ────────
const CATEGORY_MAP = {
  '基礎知識':     'basics',
  '宗教2世':      'family-and-survivors',
  '献金問題':     'social-issues',
  '勧誘':         'social-issues',
  '家族問題':     'family-and-survivors',
  '法律・判例':   'law-and-systems',
  '心理':         'support',
  '社会問題':     'social-issues',
  'ニュース解説': 'media-analysis',
  '用語解説':     'basics',
};

// sensitive 判定キーワード
const SENSITIVE_KW = [
  '被害', '暴力', '虐待', '自殺', '死亡', 'トラウマ', 'PTSD',
  '性的', '搾取', '監禁', '家庭内暴力', '家出', '失踪',
];

// タグ抽出キーワード
const TAG_KEYWORDS = [
  'カルト', 'マインドコントロール', '洗脳', '宗教法人', '脱会', '宗教二世',
  '宗教2世', '献金', '勧誘', '信教の自由', '解散命令', '裁判', '判例',
  '消費者', '家族', '支援', '相談', 'PTSD', 'トラウマ', '心理',
  'メディア', '報道', 'SNS', '法テラス', '弁護士', '行政',
  '児童虐待', '人権', '宗教法人法', '用語', 'セクト', '霊感商法',
  'ニュースレター', '訴訟', '損害賠償', '離婚', '相続', '親権',
];

// ──────── ユーティリティ ────────

function yamlStr(s) {
  if (!s) return '""';
  if (/[:#\[\]{}&*!|>'"%@`,\n]/.test(s) || s.startsWith('-') || s.startsWith(' ')) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

function extractSection(text, heading) {
  // heading名のセクションの中身を返す（次の同レベル以上の見出しまで）
  const re = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'm');
  const m = text.match(re);
  return m ? m[1].trim() : '';
}

function extractBody(text) {
  // "## 本文" 以降、 "## FAQ" または最後の "---\n\n## " まで（greedy）
  const bodyStart = text.indexOf('## 本文');
  if (bodyStart === -1) return '';

  const afterBody = text.slice(bodyStart + '## 本文'.length).replace(/^\s*\n/, '');

  // Find end: "## FAQ" or "---\n\n## 内部リンク" or "---\n\n## 品質チェック"
  let endIdx = afterBody.length;
  for (const marker of ['\n## FAQ', '\n---\n\n## 内部リンク', '\n---\n\n## 品質チェック']) {
    const idx = afterBody.indexOf(marker);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  return afterBody.slice(0, endIdx).trim();
}

function extractFAQ(text) {
  const section = extractSection(text, 'FAQ');
  if (!section) return [];
  const faqs = [];
  const re = /### Q\d+[：:]?\s*(.+?)\n(A\d+[：:]?\s*[\s\S]*?)(?=\n### Q|\n---|\n## |$)/g;
  let m;
  while ((m = re.exec(section)) !== null) {
    faqs.push({ q: m[1].trim(), a: m[2].replace(/^A\d+[：:]\s*/, '').trim() });
  }
  // Fallback: **Q1. format
  if (faqs.length === 0) {
    const re2 = /\*\*Q\d+[.．]?\s*(.+?)\*\*\s*\n(A[.．]?\s*[\s\S]*?)(?=\n\*\*Q|\n---|\n## |$)/g;
    while ((m = re2.exec(section)) !== null) {
      faqs.push({ q: m[1].trim(), a: m[2].replace(/^A[.．]?\s*/, '').trim() });
    }
  }
  return faqs;
}

function extractSlug(text) {
  const m = text.match(/`([a-z0-9-]+)`/);
  return m ? m[1] : null;
}

function extractFirst(text, heading) {
  const section = extractSection(text, heading);
  if (!section) return null;
  // 番号付きリストの最初
  const m = section.match(/^\d+[.．]\s*(.+)/m);
  return m ? m[1].trim() : section.split('\n')[0].trim();
}

function extractTags(body, category) {
  const tags = new Set();
  // カテゴリ由来のタグ
  const catTags = {
    '基礎知識': ['基礎知識'],
    '宗教2世': ['宗教二世'],
    '献金問題': ['献金'],
    '勧誘': ['勧誘'],
    '家族問題': ['家族'],
    '法律・判例': ['法律', '判例'],
    '心理': ['心理'],
    '社会問題': ['社会問題'],
    'ニュース解説': ['ニュース'],
    '用語解説': ['用語'],
  };
  for (const t of (catTags[category] || [])) tags.add(t);

  for (const kw of TAG_KEYWORDS) {
    if (body.includes(kw)) tags.add(kw);
  }
  return [...tags].slice(0, 8);
}

function detectSensitive(title, body) {
  const combined = title + '\n' + body;
  return SENSITIVE_KW.some(kw => combined.includes(kw));
}

function generateSummary(body) {
  const paragraphs = body.split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('#') && !p.startsWith('-') &&
                 !p.startsWith('*') && !p.startsWith('>') &&
                 !p.startsWith('|') && !p.startsWith('```') &&
                 !p.startsWith('<'));

  return paragraphs.slice(0, 3).map(p => {
    const text = p
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\n/g, ' ');
    return text.length > 80 ? text.slice(0, 77) + '…' : text;
  });
}

function convertInternalLinks(body) {
  // /articles/カテゴリ名/slug → /articles/slug/
  return body.replace(
    /\[([^\]]+)\]\(\/articles\/[^/]+\/([^)]+)\)/g,
    (_, label, slug) => `[${label}](/articles/${slug}/)`
  );
}

function convertHeadings(body) {
  // H3 (### ) → H2 (## ), H4 (#### ) → H3 (### )
  // 元記事の本文は H3 始まりなので1段上げる
  return body
    .replace(/^#### /gm, '### ')
    .replace(/^### /gm, '## ');
}

function cleanBody(body) {
  let result = body;
  result = convertHeadings(result);
  result = convertInternalLinks(result);
  // 末尾の余分な空行を除去
  result = result.replace(/\n{3,}/g, '\n\n').trim();
  return result;
}

// ──────── メイン変換 ────────

function convertArticle(content, sourceCategory, filename) {
  const title = content.match(/^# (.+)/m)?.[1]?.trim() || filename.replace('.md', '');
  const seoTitle = extractFirst(content, 'SEOタイトル案') || title;
  const description = extractFirst(content, 'ディスクリプション案') || title;
  const slugSection = extractSection(content, '推奨URLスラッグ');
  const slug = extractSlug(slugSection) || filename.replace('.md', '');
  const category = CATEGORY_MAP[sourceCategory] || 'basics';

  let body = extractBody(content);
  if (!body) {
    // Fallback: 全体から既知セクションを除いた部分
    body = content
      .replace(/^# .+\n/, '')
      .replace(/## SEOタイトル案[\s\S]*?(?=## 本文|$)/, '')
      .replace(/## FAQ[\s\S]*$/, '')
      .trim();
  }
  body = cleanBody(body);

  const faqs = extractFAQ(content);
  const tags = extractTags(title + '\n' + body, sourceCategory);
  let summary = generateSummary(body);
  if (summary.length === 0) {
    summary = [title.length > 80 ? title.slice(0, 77) + '…' : title];
  }
  const sensitive = detectSensitive(title, body);

  // FAQを本文末尾に追加
  if (faqs.length > 0) {
    body += '\n\n## よくある質問\n';
    for (const faq of faqs) {
      body += `\n### ${faq.q}\n\n${faq.a}\n`;
    }
  }

  // Build frontmatter
  const today = '2026-04-02';
  const fm = [
    '---',
    `title: ${yamlStr(seoTitle)}`,
    `description: ${yamlStr(description)}`,
    `summary:`,
    ...summary.map(s => `  - ${yamlStr(s)}`),
    `category: ${category}`,
    `tags:`,
    ...tags.map(t => `  - ${yamlStr(t)}`),
    `author: 信光編集部`,
    `publishedAt: ${today}`,
    `sources: []`,
    `relatedArticles: []`,
    `sensitive: ${sensitive}`,
    `legalReviewRequired: false`,
    `status: published`,
    `facts: []`,
    `unverified: []`,
    `editorNote: "この記事は信光編集部が作成した解説記事です。掲載情報は公開時点のものであり、最新の状況と異なる場合があります。"`,
    '---',
  ].join('\n');

  return { slug, content: fm + '\n\n' + body + '\n' };
}

// ──────── 実行 ────────

function main() {
  const dirs = fs.readdirSync(INPUT_BASE);
  let total = 0, success = 0, errors = [];
  const slugSet = new Set();
  const catCount = {};

  // 既存記事のslugを予約
  if (fs.existsSync(OUTPUT_BASE)) {
    for (const f of fs.readdirSync(OUTPUT_BASE)) {
      if (f.endsWith('.md')) slugSet.add(f.replace('.md', ''));
    }
  }

  for (const dir of dirs) {
    const dirPath = path.join(INPUT_BASE, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));

    for (const file of files) {
      total++;
      try {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
        const result = convertArticle(content, dir, file);

        // slug重複チェック
        let slug = result.slug;
        if (slugSet.has(slug)) {
          let i = 2;
          while (slugSet.has(`${slug}-${i}`)) i++;
          slug = `${slug}-${i}`;
        }
        slugSet.add(slug);

        const outPath = path.join(OUTPUT_BASE, `${slug}.md`);
        fs.writeFileSync(outPath, result.content, 'utf-8');

        const cat = CATEGORY_MAP[dir] || 'basics';
        catCount[cat] = (catCount[cat] || 0) + 1;
        success++;
      } catch (err) {
        errors.push({ file: `${dir}/${file}`, error: err.message });
      }
    }
  }

  console.log(`\n=== Conversion Complete ===`);
  console.log(`Total: ${total} | Success: ${success} | Errors: ${errors.length}`);
  console.log(`\nCategory distribution:`);
  for (const [cat, count] of Object.entries(catCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const e of errors) {
      console.log(`  ${e.file}: ${e.error}`);
    }
  }
  console.log(`\nOutput: ${OUTPUT_BASE}`);
  console.log(`Total files in output: ${fs.readdirSync(OUTPUT_BASE).filter(f => f.endsWith('.md')).length}`);
}

main();
