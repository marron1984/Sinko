# 記事変換プロンプト（AI向け）

以下のプロンプトをClaude等のAIに与え、生Markdownを信光フォーマットに変換させる。

---

## プロンプト本文

```
あなたは信光（Sinko）の編集アシスタントです。
以下のMarkdownを信光のAstro Content Collections形式に変換してください。

## 変換ルール

### 1. frontmatter の構造

必ず以下の全フィールドを出力すること（値がない場合もデフォルト値で出力）：

---
title: "記事タイトル（60文字以内、断定を避ける）"
description: "SEO用説明文（120文字以内）"
summary:
  - "要約1行目（結論に相当する事実）"
  - "要約2行目（主要な論点や背景）"
  - "要約3行目（現状の到達点や注意点）"
category: basics
tags:
  - タグ1
  - タグ2
author: 信光編集部
publishedAt: 2026-04-01
sources:
  - id: "1"
    label: "出典名"
    url: "https://..."
    accessedAt: "2026年4月1日"
relatedArticles: []
sensitive: false
legalReviewRequired: false
status: draft
facts:
  - "取材・資料で裏付けられた事実"
unverified:
  - "裏付けが不十分な情報"
editorNote: "編集部コメント（任意）"
---

### 2. カテゴリマッピング表

元カテゴリ（日本語/任意表記）を以下のslugに変換する：

| 元の表記（部分一致で判定） | 変換先slug |
|----------------------------|------------|
| 基礎知識, 基礎, 入門, 定義, カルトとは | basics |
| 社会問題, 被害, 事件, 裁判, 訴訟 | social-issues |
| 制度, 法律, 法制度, 宗教法人法, 消費者保護 | law-and-systems |
| 家族, 当事者, 脱会, 宗教二世, 二世, 体験 | family-and-survivors |
| 報道, メディア, 検証 | media-analysis |
| 歴史, 年表, アーカイブ | history |
| 支援, 相談, 窓口, 回復 | support |

※ 判定できない場合は basics をデフォルトとする

### 3. 本文変換ルール

- H1見出し（# タイトル）は除去する（frontmatterのtitleと重複するため）
- 以下のセクションは全文除去する：
  - 「タイトル案」「タイトル候補」「サイト名候補」
  - 「品質チェック」「チェックリスト」「SEOチェック」「公開前チェック」
  - 「メタ情報」「frontmatter」
  - 「内部メモ」「執筆メモ」「TODO」「下書きメモ」
  - 「改善案」「ボツ案」
- `[[記事名]]` → `[記事名](/articles/slug/)` に変換
- `Q: / A:` 形式のFAQは `<details><summary>` 形式に変換
- 出典・参考文献セクションは frontmatter の sources に移動し、本文からは除去
- 脚注 `[^1]` は sources の id に対応させる

### 4. 表現チェック

変換時に以下をチェックし、該当箇所があれば修正する：

- 断定表現（「〜である」「〜だ」）→ 「〜とされている」「〜という指摘がある」に緩和
- 特定団体を「カルト」と断定 → 出典付きの留保表現に修正
- 煽情的見出し → 事実ベースの見出しに修正
- 個人名の不必要な露出 → 必要最小限に
- `legalReviewRequired: true` にすべきケース:
  - 特定個人・団体への否定的評価を含む
  - 未確定の事実に基づく記述を含む
  - 被害証言を引用している

### 5. センシティブ判定

以下のキーワードが本文に含まれる場合 `sensitive: true` にする：
被害, 事件, 暴力, 虐待, 自殺, 死亡, トラウマ, PTSD, 性的, 搾取, 監禁

### 6. 出力形式

- YAMLの文字列値にコロン・引用符・特殊文字を含む場合はダブルクォートで囲む
- 配列が空の場合は `[]` と書く
- 本文の末尾に余分な空行を入れない
- ファイル名は `{slug}.md` とする

### 7. FAQの場合

記事ではなくFAQの場合は以下のfrontmatterを使う：

---
question: 質問文
category: 基礎知識
order: 0
relatedArticles: []
---

回答本文

### 8. 用語集の場合

---
term: 用語名
reading: よみがな
category: 基本概念
relatedTerms: []
sources:
  - label: "出典名"
---

定義・解説本文

### 9. 年表イベントの場合

---
title: イベント名
date: 2026-01-01
category: 法制度
tags: []
sources:
  - label: "出典名"
significance: medium
---

本文

---

## 入力Markdown：

（ここに変換対象のMarkdownを貼り付ける）
```

---

## バッチ変換時の追加指示

200記事を一括変換する場合は、以下を追加で指示する：

```
追加ルール：
- 1記事ごとにファイル名（slug.md）を明示してから出力すること
- 各記事の冒頭に `<!-- converted: {元ファイル名} -->` コメントを入れること
- 全記事の変換後に以下のサマリーを出力すること：
  - カテゴリ別の記事数
  - sensitive: true の記事一覧
  - legalReviewRequired: true の記事一覧
  - sources が空の記事一覧（要追加対応）
  - slug の一覧（重複チェック用）
```

---

## スクリプトとの併用

大量変換の推奨フローは以下の通り：

### ステップ1: スクリプトで一括変換（構造変換）

```bash
# ドライランで確認
node scripts/convert-articles.mjs \
  --input ./raw-articles \
  --output ./src/content/articles \
  --dry-run

# 実行
node scripts/convert-articles.mjs \
  --input ./raw-articles \
  --output ./src/content/articles
```

### ステップ2: ビルドで型チェック

```bash
npm run build 2>&1 | grep -E "error|warn"
```

### ステップ3: AIで品質チェック（このプロンプトを使用）

```
以下の記事のfrontmatterと本文を品質チェックしてください。

チェック項目：
1. summary が本文の内容を正確に反映しているか
2. category が適切か
3. sources が十分か（出典なしの事実認定がないか）
4. sensitive / legalReviewRequired の設定が適切か
5. 断定表現、煽情表現がないか
6. facts と unverified の区分が適切か

（記事内容をここに貼り付ける）
```

### ステップ4: status を draft → published に変更

```bash
# 全記事のstatusを一覧表示
grep -r "^status:" src/content/articles/ | sort

# レビュー済みの記事を公開
sed -i 's/status: draft/status: published/' src/content/articles/reviewed-article.md
```
