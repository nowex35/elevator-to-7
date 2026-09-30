# 7階行きのエレベーター(The Elevator to 7)

縦画面・写真風の Web ホラーゲーム。深夜の団地のエレベーターで7階の自宅へ帰る。止まった階で扉を開けるか通過するかを選び、開けたら「おかしければ閉める/なければ待つ」。

ハッシュタグ: `#7階行きのエレベーター` / `#ElevatorTo7`

公開先: https://elevator7.nowex35.com (Cloudflare Workers `elevator-to-7` + D1 `night-elevator`。2026-09-30 デプロイ)

## デプロイ

```bash
cd app
SITE_URL=https://elevator7.nowex35.com npm run build:cards   # シェア用ファイルを公開先の URL で作る
npx wrangler d1 migrations apply night-elevator --remote     # 新しい migration を足したときだけ
npx wrangler deploy
```

- `app/` ディレクトリには wrangler の auth profile `nowex35`(nowex35.com を持つアカウント)を結び付けてある(`wrangler auth activate nowex35 .`)。ほかのディレクトリでは既定のログインのまま。アカウントIDはリポジトリに入れていない(`wrangler.jsonc` に `account_id` を書かない)。ログインが複数のアカウントに入れる場合や CI では、環境変数 `CLOUDFLARE_ACCOUNT_ID` で渡す。
  - 別のマシンで作業するときは、先に `npx wrangler auth create nowex35` でログインし、`app/` で `npx wrangler auth activate nowex35 .` を実行する。
- `elevator7.nowex35.com` は Workers の独自ドメイン(`wrangler.jsonc` の `routes`)。DNS レコードと証明書は Cloudflare が作った。
- `build:cards` を `SITE_URL` なしで実行すると、SNS のカード情報が `localhost` を指す。**そのままデプロイしない。**
## ディレクトリ

| パス | 中身 |
|---|---|
| `app/` | 本体。Cloudflare Workers(静的配信+API)と D1 |
| `app/public/` | ゲーム本体(`index.html`)と画像(`parts/`、WebP)。`og/` と `s/` は生成物(下記) |
| `app/src/index.js` | サーバー:記録の保存と順位 |
| `app/scripts/build-cards.mjs` | シェア用のページとカード画像を作る(`scripts/cards/` にレイアウト・文言・写真) |
| `app/migrations/` | D1 の表定義 |
| `assets-src/` | 素材の元ファイル(`parts/` は変換前の PNG/JPG、`fonts/` はカード用フォント)。配信しない |
| `docs/scenario.md` | 遊びの仕様(シナリオ・ルール・異変・スコア・決定の記録) |
| `docs/research-summary.md` | 拡散系サービス・ホラー作品・SNS 共有導線の調査まとめ |
| `prototype/` | 検討用のモック(絵柄比較・パーツ合成・最初の遊べるモック)と素材の元画像・生成プロンプト。本体は `app/` 側で更新する |

## 手元で動かす

```bash
cd app
npm install
npm run db:migrate:local
npm run build:cards
npm run dev
```

http://localhost:8787 を開く(`&lang=en` で英語、`?seed=<番号>` で特定の夜。確認用)。

## サーバー API

Worker が処理するのは `/api/*` だけ。それ以外は静的ファイルとして配信する(無料・回数無制限)。

| | |
|---|---|
| `POST /api/runs` | 1回のプレイ結果を保存し、7階に帰り着いたときは全体の順位を返す |
| `GET /api/stats` | 順位だけ返す(`?score=&home=1`) |

## シェア

- シェア用のページ `/s/<ja|en>-<7|2〜6>`(7 = 帰り着いた、2〜6 = その階で途切れた)。SNS のカード情報を返し、開いた人はゲームのトップ(新しい夜)へ。
- カード画像 `/og/<ja|en>-<7|2〜6>.png` と `/og/top.png`(トップページ用)。スコアは載せず、シェア文にだけ出す。
- 結果画面の共有先:Xでシェア/LINEで送る/画像で共有(ブラウザで縦長の画像を描いて共有メニューへ。使えなければ画像を出して保存)/コピー。

### シェア用のファイルを作り直す

文言(`scripts/cards/text.mjs`)・レイアウト(`scripts/cards/card.mjs`)・写真(`scripts/cards/img/`)を変えたとき、または公開先のドメインが決まったときに実行する。

```bash
cd app
SITE_URL=https://<公開先のドメイン> npm run build:cards
```

- `public/og/`・`public/s/` と、`public/index.html` の `<!-- og:start -->`〜`<!-- og:end -->` を書き換える。**SNS のカード情報は絶対 URL が必要なので、デプロイ前に `SITE_URL` を付けて作り直す**(省くと `http://localhost:8787`)。
- デザインや文言を変えたら `build-cards.mjs` の `CARD_VERSION` を上げる(画像の URL が変わり、SNS 側のキャッシュが切り替わる)。
- python3 と fonttools が必要(可変ウェイトの Noto Sans JP から 400/700 を取り出し、`app/.cache/fonts/` に置く)。
- フォント本体はリポジトリに入れていない。`assets-src/fonts/LICENSE-NotoSansJP.txt` の入手先から取ってきて、`assets-src/fonts/NotoSansJP[wght].ttf` に置く。

## 画像

- `public/parts/` は WebP(合計約 1.1MB)。元の PNG/JPG は `assets-src/parts/`。人物は全員を同じ倍率(60%)で縮めている。
- 人物画像を差し替えたら、`index.html` の `DIM`(幅と高さの表)を測り直す。
- ゲームは最初に扉と廊下だけを読み込み、その夜に出る画像は貼り紙を読んでいる間に裏で読み込む。

## 無料枠の上限(Cloudflare の公式ドキュメントより)

| | 上限 | このゲームで当たるところ |
|---|---|---|
| Worker の呼び出し | 10万回/日 | `/api/*` だけ(1プレイ1回) |
| Worker の処理時間 | 1回 10ms(CPU) | カード画像はビルド時に作るので当たらない |
| D1 の書き込み | 10万行/日(索引の更新も1行) | ドボン1行/帰り着いた3行。帰り着いたプレイで約3.3万回/日 |
| D1 の読み込み | 500万行/日 | 順位は度数表(最大数百行)から。帰り着いた人が2,000人未満のうちだけ正確に数える |

超えるとその日は記録の保存と順位が止まる(ゲームとシェアは静的ファイルなので止まらない)。

- 「ドボン1行」は、帰り着いた記録だけを入れる部分索引(`WHERE home = 1`)なら、ドボンの記録では索引を書かないという前提の推定(公式ドキュメントに部分索引の扱いは書かれていない)。
- 開けて判断した記録は `runs.enc`(JSON)に入れる。`encounters` 表は 0003 から書いていない(古い記録のために残してある)。

## 未対応(次の段階)

- スコアの改ざん対策(今は値の範囲チェックのみ)
