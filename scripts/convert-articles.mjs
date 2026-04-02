#!/usr/bin/env node
/**
 * convert-articles.mjs
 *
 * 生Markdownファイル群を信光（Sinko）のAstro Content Collections形式に一括変換する。
 *
 * 処理内容:
 *   1. 入力ディレクトリの全 .md を走査
 *   2. 既存frontmatterがあれば解析、なければ本文からメタ情報を推論
 *   3. カテゴリを信光スラッグにマッピング
 *   4. 不要セクション（タイトル案、品質チェック等）を除外
 *   5. FAQ・内部リンク・出典を信光フォーマットに変換
 *   6. 変換結果を出力ディレクトリに書き出し
 *
 * 使い方:
 *   node scripts/convert-articles.mjs --input ./raw-articles --output ./src/content/articles
 *   node scripts/convert-articles.mjs --input ./raw-articles --output ./src/content/articles --dry-run
 *   node scripts/convert-articles.mjs --input ./raw-articles --output ./src/content/articles --format faq
 */

import fs from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────
// カテゴリマッピング表
// ─────────────────────────────────────────────
const CATEGORY_MAP = {
  // 日本語 → slug
  '基礎知識':         'basics',
  '基礎':             'basics',
  '入門':             'basics',
  '定義':             'basics',
  'カルトとは':       'basics',
  '社会問題':         'social-issues',
  '被害':             'social-issues',
  '事件':             'social-issues',
  '裁判':             'social-issues',
  '訴訟':             'social-issues',
  '制度':             'law-and-systems',
  '法律':             'law-and-systems',
  '法制度':           'law-and-systems',
  '宗教法人法':       'law-and-systems',
  '消費者保護':       'law-and-systems',
  '家族':             'family-and-survivors',
  '当事者':           'family-and-survivors',
  '脱会':             'family-and-survivors',
  '宗教二世':         'family-and-survivors',
  '二世':             'family-and-survivors',
  '体験':             'family-and-survivors',
  '報道':             'media-analysis',
  'メディア':         'media-analysis',
  '検証':             'media-analysis',
  '歴史':             'history',
  '年表':             'history',
  'アーカイブ':       'history',
  '支援':             'support',
  '相談':             'support',
  '窓口':             'support',
  '回復':             'support',

  // 英語 → slug (そのままの場合)
  'basics':                'basics',
  'social-issues':         'social-issues',
  'law-and-systems':       'law-and-systems',
  'family-and-survivors':  'family-and-survivors',
  'media-analysis':        'media-analysis',
  'history':               'history',
  'support':               'support',
};

const VALID_CATEGORIES = new Set([
  'basics', 'social-issues', 'law-and-systems',
  'family-and-survivors', 'media-analysis', 'history', 'support',
]);

// ─────────────────────────────────────────────
// 除外セクション見出しパターン
// ─────────────────────────────────────────────
const EXCLUDE_HEADING_PATTERNS = [
  /^#+\s*タイトル案/,
  /^#+\s*タイトル候補/,
  /^#+\s*サイト名候補/,
  /^#+\s*品質チェック/,
  /^#+\s*チェックリスト/,
  /^#+\s*SEOチェック/,
  /^#+\s*公開前チェック/,
  /^#+\s*メタ情報/,
  /^#+\s*frontmatter/i,
  /^#+\s*内部メモ/,
  /^#+\s*執筆メモ/,
  /^#+\s*TODO/i,
  /^#+\s*下書きメモ/,
  /^#+\s*改善案/,
  /^#+\s*ボツ案/,
];

// ─────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toAsciiSlug(text) {
  // 日本語タイトルからの簡易slug生成
  // 英数字・ハイフンのみ残す
  const ascii = text
    .replace(/[「」『』（）【】〈〉《》・、。]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `article-${Date.now()}`;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { meta: {}, body: content };

  const raw = match[1];
  const body = content.slice(match[0].length).trim();
  const meta = {};

  // 簡易YAMLパーサー（フラットなkey: value対応）
  let currentKey = null;
  let currentArrayKey = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trimEnd();

    // 配列要素
    if (currentArrayKey && /^\s+-\s/.test(trimmed)) {
      const val = trimmed.replace(/^\s+-\s*/, '').replace(/^["']|["']$/g, '');
      if (!meta[currentArrayKey]) meta[currentArrayKey] = [];
      meta[currentArrayKey].push(val);
      continue;
    }

    // key: value
    const kvMatch = trimmed.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].replace(/^["']|["']$/g, '').trim();
      currentArrayKey = null;

      if (val === '' || val === '[]') {
        currentArrayKey = key;
        meta[key] = meta[key] || [];
      } else {
        meta[key] = val;
        currentKey = key;
      }
    }
  }

  return { meta, body };
}

function resolveCategory(raw) {
  if (!raw) return 'basics';
  const normalized = raw.trim();
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];

  // 部分一致を試す
  for (const [keyword, slug] of Object.entries(CATEGORY_MAP)) {
    if (normalized.includes(keyword)) return slug;
  }
  return 'basics'; // デフォルト
}

function extractTitleFromBody(body) {
  const h1 = body.match(/^#\s+(.+)/m);
  return h1 ? h1[1].trim() : null;
}

function extractDescriptionFromBody(body) {
  // 最初の段落テキストを抽出
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') &&
        !trimmed.startsWith('*') && !trimmed.startsWith('>') &&
        !trimmed.startsWith('|') && !trimmed.startsWith('```')) {
      return trimmed.slice(0, 160);
    }
  }
  return '';
}

function extractTagsFromBody(body) {
  const tags = new Set();
  const keywords = [
    'カルト', 'マインドコントロール', '洗脳', '宗教法人',
    '脱会', '宗教二世', '献金', '勧誘', '信教の自由',
    '解散命令', 'マインドコントロール', '被害', '裁判',
    '行政処分', '消費者', '家族', '支援', '相談',
  ];
  for (const kw of keywords) {
    if (body.includes(kw)) tags.add(kw);
  }
  return [...tags].slice(0, 6);
}

function generateSummary(body) {
  // 最初の3つの段落から要約を生成
  const paragraphs = body.split('\n\n')
    .map(p => p.trim())
    .filter(p => p && !p.startsWith('#') && !p.startsWith('-') &&
                 !p.startsWith('*') && !p.startsWith('>') &&
                 !p.startsWith('|') && !p.startsWith('```'));

  return paragraphs.slice(0, 3).map(p => {
    const text = p.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // リンク除去
                  .replace(/\*\*([^*]+)\*\*/g, '$1')       // bold除去
                  .replace(/\*([^*]+)\*/g, '$1');           // italic除去
    return text.length > 80 ? text.slice(0, 77) + '...' : text;
  });
}

// ─────────────────────────────────────────────
// 本文変換
// ─────────────────────────────────────────────

function removeExcludedSections(body) {
  const lines = body.split('\n');
  const result = [];
  let excluding = false;
  let excludeLevel = 0;

  for (const line of lines) {
    // 除外セクション開始チェック
    const isHeading = line.match(/^(#{1,6})\s/);
    if (isHeading) {
      const level = isHeading[1].length;
      if (excluding && level <= excludeLevel) {
        excluding = false; // 除外セクションを抜けた
      }
      if (!excluding && EXCLUDE_HEADING_PATTERNS.some(p => p.test(line))) {
        excluding = true;
        excludeLevel = level;
        continue;
      }
    }
    if (!excluding) {
      result.push(line);
    }
  }
  return result.join('\n');
}

function removeH1(body) {
  // 本文先頭のH1を除去（frontmatterのtitleと重複するため）
  return body.replace(/^#\s+.+\n*/, '');
}

function convertInternalLinks(body) {
  // [[記事名]] → [記事名](/articles/記事名/)
  return body.replace(/\[\[([^\]]+)\]\]/g, (_, name) => {
    const slug = toAsciiSlug(name);
    return `[${name}](/articles/${slug}/)`;
  });
}

function convertFAQSections(body) {
  // Q: / A: 形式をdetails/summary形式に変換（本文内FAQ用）
  return body.replace(
    /(?:^|\n)Q[：:]\s*(.+)\nA[：:]\s*([\s\S]*?)(?=\nQ[：:]|\n##|\n$|$)/g,
    (_, q, a) => `\n<details>\n<summary>${q.trim()}</summary>\n\n${a.trim()}\n\n</details>\n`
  );
}

function extractSources(body) {
  const sources = [];
  const sourcePatterns = [
    // [1] 出典名 URL 形式
    /\[(\d+)\]\s*(.+?)(?:\s+(https?:\/\/\S+))?\s*$/gm,
    // 脚注形式 [^1]: 出典名
    /\[\^(\d+)\]:\s*(.+?)(?:\s+(https?:\/\/\S+))?\s*$/gm,
  ];

  let cleanBody = body;

  for (const pattern of sourcePatterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      sources.push({
        id: match[1],
        label: match[2].trim(),
        ...(match[3] ? { url: match[3].trim() } : {}),
      });
    }
    // 出典行を本文から除去
    cleanBody = cleanBody.replace(pattern, '');
  }

  // 「出典」「参考文献」セクションも抽出
  const sourceSection = cleanBody.match(
    /(?:^|\n)#{1,3}\s*(?:出典|参考文献|参照|References?)\s*\n([\s\S]*?)(?=\n#{1,3}\s|\n$|$)/i
  );

  if (sourceSection) {
    const lines = sourceSection[1].split('\n').filter(l => l.trim());
    let idx = sources.length + 1;
    for (const line of lines) {
      const cleaned = line.replace(/^[-*•]\s*/, '').trim();
      if (cleaned) {
        const urlMatch = cleaned.match(/(https?:\/\/\S+)/);
        const label = cleaned.replace(/(https?:\/\/\S+)/, '').trim();
        if (!sources.some(s => s.label === label)) {
          sources.push({
            id: String(idx++),
            label: label || cleaned,
            ...(urlMatch ? { url: urlMatch[1] } : {}),
          });
        }
      }
    }
    // セクションを除去
    cleanBody = cleanBody.replace(
      /(?:^|\n)#{1,3}\s*(?:出典|参考文献|参照|References?)\s*\n[\s\S]*?(?=\n#{1,3}\s|\n$|$)/i,
      ''
    );
  }

  return { sources, cleanBody: cleanBody.trim() };
}

function detectSensitive(body, title = '') {
  const sensitiveKeywords = [
    '被害', '事件', '暴力', '虐待', '自殺', '死亡',
    'トラウマ', 'PTSD', '性的', '搾取', '監禁',
  ];
  const combined = title + '\n' + body;
  return sensitiveKeywords.some(kw => combined.includes(kw));
}

// ─────────────────────────────────────────────
// メイン変換関数
// ─────────────────────────────────────────────

function convertArticle(inputContent, filename) {
  const { meta, body: rawBody } = parseFrontmatter(inputContent);

  // メタ情報の解決
  const title = meta.title || extractTitleFromBody(rawBody) || path.basename(filename, '.md');
  const description = meta.description || extractDescriptionFromBody(rawBody);
  const category = resolveCategory(meta.category);
  const publishedAt = meta.publishedAt || meta.date || meta.published || new Date().toISOString().split('T')[0];
  const slug = meta.slug || toAsciiSlug(title);

  // 本文変換パイプライン
  let body = rawBody;
  body = removeH1(body);
  body = removeExcludedSections(body);
  body = convertInternalLinks(body);
  body = convertFAQSections(body);

  const { sources, cleanBody } = extractSources(body);
  body = cleanBody;

  // タグ
  const tags = meta.tags
    ? (Array.isArray(meta.tags) ? meta.tags : meta.tags.split(',').map(t => t.trim()))
    : extractTagsFromBody(body);

  // 要約
  const summary = meta.summary
    ? (Array.isArray(meta.summary) ? meta.summary : [meta.summary])
    : generateSummary(body);

  // センシティブ判定
  const sensitive = meta.sensitive === 'true' || meta.sensitive === true || detectSensitive(body, title);

  // frontmatter組み立て
  const frontmatter = {
    title,
    description,
    summary: summary.slice(0, 3),
    category,
    tags: tags.slice(0, 8),
    author: meta.author || '信光編集部',
    publishedAt,
    ...(meta.updatedAt ? { updatedAt: meta.updatedAt } : {}),
    sources,
    relatedArticles: meta.relatedArticles || [],
    sensitive,
    legalReviewRequired: false,
    status: meta.status || 'draft',
    facts: meta.facts || [],
    unverified: meta.unverified || [],
    ...(meta.editorNote ? { editorNote: meta.editorNote } : {}),
  };

  return { slug, frontmatter, body };
}

function convertFAQ(inputContent, filename) {
  const { meta, body } = parseFrontmatter(inputContent);
  const question = meta.question || meta.title || extractTitleFromBody(body) || filename;

  const frontmatter = {
    question,
    category: meta.category || '基礎知識',
    order: parseInt(meta.order) || 0,
    relatedArticles: meta.relatedArticles || [],
  };

  return { slug: toAsciiSlug(question), frontmatter, body: removeH1(body) };
}

// ─────────────────────────────────────────────
// YAML出力
// ─────────────────────────────────────────────

function toYaml(obj, indent = 0) {
  const pad = '  '.repeat(indent);
  const lines = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`);
      } else if (typeof value[0] === 'object') {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          const entries = Object.entries(item);
          lines.push(`${pad}  - ${entries[0][0]}: ${yamlValue(entries[0][1])}`);
          for (const [k, v] of entries.slice(1)) {
            lines.push(`${pad}    ${k}: ${yamlValue(v)}`);
          }
        }
      } else {
        lines.push(`${pad}${key}:`);
        for (const item of value) {
          lines.push(`${pad}  - ${yamlValue(item)}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${pad}${key}:`);
      lines.push(toYaml(value, indent + 1));
    } else {
      lines.push(`${pad}${key}: ${yamlValue(value)}`);
    }
  }

  return lines.join('\n');
}

function yamlValue(v) {
  if (typeof v === 'boolean') return v.toString();
  if (typeof v === 'number') return v.toString();
  if (typeof v === 'string') {
    // YAML特殊文字を含む場合はクォート
    if (/[:#\[\]{}&*!|>'"%@`?,\n]/.test(v) || v.startsWith('-') || v.startsWith(' ')) {
      return `"${v.replace(/"/g, '\\"')}"`;
    }
    return v;
  }
  return JSON.stringify(v);
}

function buildMarkdown(frontmatter, body) {
  return `---\n${toYaml(frontmatter)}\n---\n\n${body}\n`;
}

// ─────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    input: null,
    output: null,
    format: 'article',  // article | faq | glossary | timeline
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--input':   opts.input = args[++i]; break;
      case '--output':  opts.output = args[++i]; break;
      case '--format':  opts.format = args[++i]; break;
      case '--dry-run': opts.dryRun = true; break;
    }
  }

  if (!opts.input || !opts.output) {
    console.error('Usage: node convert-articles.mjs --input <dir> --output <dir> [--format article|faq] [--dry-run]');
    process.exit(1);
  }

  return opts;
}

function main() {
  const opts = parseArgs();
  const inputDir = path.resolve(opts.input);
  const outputDir = path.resolve(opts.output);

  if (!fs.existsSync(inputDir)) {
    console.error(`Input directory not found: ${inputDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
  console.log(`Found ${files.length} Markdown files in ${inputDir}`);

  if (!opts.dryRun) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = { success: 0, error: 0, skipped: 0 };
  const slugSet = new Set();
  const report = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(inputDir, file), 'utf-8');
      let result;

      switch (opts.format) {
        case 'faq':
          result = convertFAQ(content, file);
          break;
        case 'article':
        default:
          result = convertArticle(content, file);
          break;
      }

      // slug重複チェック
      let slug = result.slug;
      if (slugSet.has(slug)) {
        let i = 2;
        while (slugSet.has(`${slug}-${i}`)) i++;
        slug = `${slug}-${i}`;
      }
      slugSet.add(slug);

      const outputPath = path.join(outputDir, `${slug}.md`);
      const outputContent = buildMarkdown(result.frontmatter, result.body);

      if (opts.dryRun) {
        report.push({
          input: file,
          output: `${slug}.md`,
          title: result.frontmatter.title || result.frontmatter.question,
          category: result.frontmatter.category,
          sources: (result.frontmatter.sources || []).length,
          sensitive: result.frontmatter.sensitive,
        });
      } else {
        fs.writeFileSync(outputPath, outputContent, 'utf-8');
      }

      results.success++;
    } catch (err) {
      console.error(`Error processing ${file}: ${err.message}`);
      results.error++;
    }
  }

  // レポート出力
  console.log(`\n--- Conversion Report ---`);
  console.log(`Total: ${files.length} | Success: ${results.success} | Error: ${results.error}`);

  if (opts.dryRun && report.length > 0) {
    console.log(`\nDry-run preview (first 20):`);
    console.table(report.slice(0, 20));

    // カテゴリ分布
    const catDist = {};
    for (const r of report) {
      catDist[r.category] = (catDist[r.category] || 0) + 1;
    }
    console.log(`\nCategory distribution:`);
    console.table(catDist);
  }

  if (!opts.dryRun) {
    console.log(`\nFiles written to: ${outputDir}`);
    console.log(`\nNext steps:`);
    console.log(`  1. npm run build  で型チェック・ビルド確認`);
    console.log(`  2. status: 'draft' の記事を確認して 'published' に変更`);
    console.log(`  3. sources が空の記事に出典を追加`);
    console.log(`  4. sensitive: true の記事を目視確認`);
  }
}

main();
