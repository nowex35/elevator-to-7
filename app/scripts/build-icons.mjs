// アイコンとファビコンを作る:ゲームの最初に押す、橙色に光る「7」のボタン
//   public/favicon.svg / favicon.ico(16・32・48) / apple-touch-icon.png(180)
//   public/icon-192.png / icon-512.png / icon-maskable-512.png / site.webmanifest
// 使い方: node scripts/build-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg, initWasm } from "@resvg/resvg-wasm";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
await initWasm(readFileSync(require.resolve("@resvg/resvg-wasm/index_bg.wasm")));

const ORANGE = "#ff7a4a", GLOW = "#ffb08a", PANEL = "#1b1e20", FACE = "#2a2e31";

// 「7」はフォントに頼らず線で描く(どの端末でも同じ形)
const seven = (sw) => `<path d="M-58 -78 H62 L-10 82" fill="none" stroke="${GLOW}" stroke-width="${sw}" stroke-linecap="square" stroke-linejoin="miter"/>`;

// 大きいアイコン:操作盤の上の、光る丸いボタン。scale でボタンの大きさ(マスク用は小さめ)
function bigIcon({ scale = 1, round = false } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="panel" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#2b2f32"/><stop offset="1" stop-color="#0e0f10"/></radialGradient>
    <radialGradient id="face" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#34393c"/><stop offset="1" stop-color="#1c1f21"/></radialGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <rect width="512" height="512" rx="${round ? 112 : 0}" fill="url(#panel)"/>
  <g transform="translate(256 256) scale(${scale})">
    <circle r="170" fill="none" stroke="${ORANGE}" stroke-width="30" opacity=".75" filter="url(#glow)"/>
    <circle r="158" fill="url(#face)"/>
    <circle r="158" fill="none" stroke="${ORANGE}" stroke-width="22"/>
    <circle r="140" fill="none" stroke="${ORANGE}" stroke-width="10" opacity=".35" filter="url(#soft)"/>
    <g opacity=".6" filter="url(#soft)">${seven(38)}</g>
    ${seven(34)}
  </g>
</svg>`;
}

// ファビコン:小さくても読めるよう、光やグラデーションを省いて太くする
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="28" fill="${FACE}" stroke="${ORANGE}" stroke-width="6"/>
  <path d="M21.5 20.5 H42.5 L30 45" fill="none" stroke="${GLOW}" stroke-width="6.5" stroke-linecap="square" stroke-linejoin="miter"/>
</svg>`;

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
const out = p => join(root, "public", p);

writeFileSync(out("favicon.svg"), favicon);
writeFileSync(out("apple-touch-icon.png"), png(bigIcon(), 180));
writeFileSync(out("icon-192.png"), png(bigIcon({ round: true }), 192));
writeFileSync(out("icon-512.png"), png(bigIcon({ round: true }), 512));
writeFileSync(out("icon-maskable-512.png"), png(bigIcon({ scale: .78 }), 512)); // 端末が丸や角丸に切り抜いても欠けない大きさ

// favicon.ico:PNG をそのまま入れる形式(16・32・48)
const icoPngs = [16, 32, 48].map(s => [s, png(favicon, s)]);
const head = Buffer.alloc(6 + 16 * icoPngs.length);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(icoPngs.length, 4);
let offset = head.length;
icoPngs.forEach(([s, data], i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(s, e); head.writeUInt8(s, e + 1); head.writeUInt8(0, e + 2); head.writeUInt8(0, e + 3);
  head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(data.length, e + 8); head.writeUInt32LE(offset, e + 12);
  offset += data.length;
});
writeFileSync(out("favicon.ico"), Buffer.concat([head, ...icoPngs.map(([, d]) => d)]));

writeFileSync(out("site.webmanifest"), JSON.stringify({
  name: "7階行きのエレベーター", short_name: "7階行き", lang: "ja", start_url: "/", display: "standalone",
  background_color: "#0b0b0c", theme_color: "#0b0b0c",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
}, null, 2) + "\n");

console.log("public/ に favicon.svg / favicon.ico / apple-touch-icon.png / icon-192.png / icon-512.png / icon-maskable-512.png / site.webmanifest");
