# 信光（Sinko）運用ガイド

## 導入手順

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（http://localhost:4321）
npm run dev

# 本番ビルド
npm run build

# ビルド結果のプレビュー
npm run preview
```

## ディレクトリ構成

```
src/
├── components/       # UIコンポーネント
│   ├── Head.astro           # SEO/OGP/構造化データ
│   ├── Header.astro         # ヘッダー（ナビ・検索・ダークモード）
│   ├── Footer.astro         # フッター（免責事項含む）
│   ├── Breadcrumb.astro     # パンくずリスト
│   ├── ArticleCard.astro    # 記事カード
│   ├── SensitiveWarning.astro  # センシティブ記事の注意書き
│   ├── SourceList.astro     # 出典一覧
│   ├── LegalDisclaimer.astro   # 法務免責文
│   ├── Newsletter.astro     # ニュースレター登録
│   ├── RelatedArticles.astro   # 関連記事
│   └── SeriesNav.astro      # シリーズ前後ナビ
├── content/          # コンテンツ（Markdown）
│   ├── articles/     # 記事
│   ├── authors/      # 著者プロフィール
│   ├── glossary/     # 用語集
│   ├── timeline/     # 年表イベント
│   ├── faq/          # FAQ
│   ├── support/      # 支援窓口
│   └── organizations/ # 団体情報
├── layouts/          # レイアウト
│   ├── BaseLayout.astro     # 基本レイアウト
│   └── ArticleLayout.astro  # 記事レイアウト
├── lib/              # ユーティリティ
│   ├── categories.ts        # カテゴリ定義
│   ├── seo.ts               # SEO/JSON-LD生成
│   └── utils.ts             # 汎用ユーティリティ
├── pages/            # ページ（ルーティング）
├── styles/           # グローバルCSS
└── content.config.ts # コンテンツスキーマ定義
```

## 記事の追加方法

`src/content/articles/` に Markdown ファイルを作成します。

```markdown
---
title: "記事タイトル"
description: "記事の説明（SEO用、120文字程度）"
summary:
  - "要約1行目"
  - "要約2行目"
  - "要約3行目"
category: basics  # basics | social-issues | law-and-systems | family-and-survivors | media-analysis | history | support
tags:
  - タグ1
  - タグ2
author: 信光編集部
publishedAt: 2026-04-01
sources:
  - id: "1"
    label: "出典名"
    url: "https://example.com"
    accessedAt: "2026年4月1日"
sensitive: false  # true にすると注意書きが表示される
status: published  # draft | review | published | archived
facts:
  - "確認できた事実"
unverified:
  - "未確認情報"
editorNote: "編集部コメント（任意）"
---

本文をMarkdownで記述
```

## 年表イベントの追加

`src/content/timeline/` にファイルを作成:

```markdown
---
title: イベント名
date: 2026-01-01
category: 法制度  # 法制度 | 事件 | 行政 | 報道 | 裁判
tags: [タグ]
sources:
  - label: 出典名
significance: high  # high | medium | low
---
本文
```

## 用語の追加

`src/content/glossary/` にファイルを作成:

```markdown
---
term: 用語名
reading: よみがな
category: 基本概念  # 基本概念 | 法制度 | 心理学 等
relatedTerms: [関連用語]
sources:
  - label: 出典名
---
定義・解説
```

## 支援窓口の追加

`src/content/support/` にファイルを作成:

```markdown
---
name: 窓口名
category: legal  # legal | mental-health | family | general | government
phone: "電話番号"
url: "https://..."
hours: 受付時間
description: 説明
isVerified: true
lastVerified: 2026-04-01
---
詳細説明
```

## カテゴリの変更

`src/lib/categories.ts` で定義。変更時は `content.config.ts` の `category` enum も合わせて更新すること。

## デプロイ

Static出力のため、任意の静的ホスティングに対応:
- Cloudflare Pages: `npm run build` → `dist/` を配信
- Vercel: フレームワーク `Astro` を選択
- Netlify: ビルドコマンド `npm run build`、公開ディレクトリ `dist`

## 品質チェックリスト（公開前）

- [ ] 出典がすべて記載されているか
- [ ] 未確認情報は明示的に区別されているか
- [ ] センシティブ記事には `sensitive: true` が設定されているか
- [ ] 断定的表現が含まれていないか
- [ ] 名誉毀損リスクのある表現がないか（`legalReviewRequired: true` でフラグ可）
- [ ] 相談窓口の電話番号・URLが最新か

## CMS連携

Content Collections はヘッドレスCMS（Contentful, microCMS, Notion等）のデータソースに置き換え可能。
`content.config.ts` の `loader` を変更するだけで対応できる。
