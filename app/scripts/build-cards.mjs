// シェア用の静的ファイルを作る(Worker を通さないので、無料枠の処理時間の上限に当たらない)
//   public/og/<lang>-<結果>.png   結果ごとの SNS カード画像(日英 × 7階に帰り着いた/2〜6階で途切れた = 12枚)
//   public/og/top.png            トップページ用のカード画像
//   public/s/<lang>-<結果>.html   シェア用のページ(SNS のカード情報を返し、人はゲームのトップへ)
//   public/index.html            <!-- og:start --> 〜 <!-- og:end --> の間を書き換える
// 使い方: SITE_URL=https://<公開先のドメイン> node scripts/build-cards.mjs
//   (python3 と fonttools が必要。SITE_URL を省くと http://localhost:8787)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderCard, initCards } from "./cards/card.mjs";
import { T, LANGS, RESULTS, resultText } from "./cards/text.mjs";

// デザインや文言を変えたら上げる(画像の URL に入り、SNS 側のキャッシュが切り替わる)
const CARD_VERSION = 4;

const root = fileURLToPath(new URL("..", import.meta.url));
const SITE = (process.env.SITE_URL || "http://localhost:8787").replace(/\/+$/, "");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// フォント: 可変ウェイトの Noto Sans JP(SIL OFL 1.1)から 400 / 700 を取り出す。配信しないので文字は絞らない
const cache = join(root, ".cache/fonts");
mkdirSync(cache, { recursive: true });
const fonts = {};
for (const w of [400, 700]) {
  const out = join(cache, `NotoSansJP-${w}.ttf`);
  if (!existsSync(out)) execFileSync("python3", ["-m", "fontTools.varLib.instancer", join(root, "../assets-src/fonts/NotoSansJP[wght].ttf"), `wght=${w}`, "-o", out], { stdio: "inherit" });
  fonts[w] = readFileSync(out);
}

const require = createRequire(import.meta.url);
await initCards(readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));
const photo = name => `data:image/jpeg;base64,${readFileSync(join(root, `scripts/cards/img/card-${name}.jpg`)).toString("base64")}`;
const PHOTO = { home: photo("home"), dead: photo("dead") };

mkdirSync(join(root, "public/og"), { recursive: true });
mkdirSync(join(root, "public/s"), { recursive: true });

// SNS のカード情報(OGP / X)
function ogTags({ lang, url, image, description }) {
  const t = T[lang];
  return [
    `<meta name="description" content="${esc(description)}">`,
    `<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(t.title)}">`,
    `<meta property="og:title" content="${esc(t.title)}"><meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(image)}">`,
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(t.title)}">`,
    `<meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(image)}">`,
  ].join("\n");
}

for (const lang of LANGS) {
  const t = T[lang], game = lang === "ja" ? "/" : "/?lang=en";
  for (const r of RESULTS) {
    const name = `${lang}-${r}`;
    writeFileSync(join(root, `public/og/${name}.png`), await renderCard({ lang, result: r, photo: r === 7 ? PHOTO.home : PHOTO.dead, fonts }));
    const html = `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
${ogTags({ lang, url: `${SITE}/s/${name}`, image: `${SITE}/og/${name}.png?v=${CARD_VERSION}`, description: resultText(lang, r) + (lang === "ja" ? "。" : ". ") + t.invite })}
<link rel="canonical" href="${esc(SITE + game)}">
<meta http-equiv="refresh" content="0;url=${esc(game)}">
</head>
<body style="background:#000;color:#aaa;font-family:sans-serif"><a href="${esc(game)}" style="color:#aaa">${esc(t.title)}</a></body>
</html>
`;
    writeFileSync(join(root, `public/s/${name}.html`), html);
  }
}

// トップページ(日本語)
writeFileSync(join(root, "public/og/top.png"), await renderCard({ lang: "ja", result: null, photo: PHOTO.home, fonts }));
const indexPath = join(root, "public/index.html");
const index = readFileSync(indexPath, "utf8");
const block = `<!-- og:start (scripts/build-cards.mjs が書き換える) -->\n${ogTags({ lang: "ja", url: `${SITE}/`, image: `${SITE}/og/top.png?v=${CARD_VERSION}`, description: T.ja.lead })}\n<!-- og:end -->`;
const re = /<!-- og:start[\s\S]*?<!-- og:end -->/;
if (!re.test(index)) throw new Error("public/index.html に <!-- og:start --> 〜 <!-- og:end --> がない");
writeFileSync(indexPath, index.replace(re, block));

console.log(`SITE_URL=${SITE}\n  public/og/*.png  ${LANGS.length * RESULTS.length + 1}枚\n  public/s/*.html  ${LANGS.length * RESULTS.length}枚\n  public/index.html の OGP`);
