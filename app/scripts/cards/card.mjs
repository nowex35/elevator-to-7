// SNS カード画像(1200x630)のレイアウト。Satori で SVG にし、resvg で PNG にする(ビルド時に Node で実行)。
import satori from "satori";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import { T, resultText, RESULTS } from "./text.mjs";

let wasmReady = null;
export const initCards = wasm => (wasmReady ??= initWasm(wasm));

// Satori に渡す要素(JSX を使わずに書く)
const h = (type, style, ...children) => ({ type, props: { style, children: children.length === 1 ? children[0] : children } });

const INK = "#1d1d1b", RED = "#6b2a20", FAINT = "#b3afa4", SUB = "#555";

// 階の並び(2F〜7F)。どこまで行けたかを、現象を明かさずに見せる
function floorStrip(r) {
  const cells = [2, 3, 4, 5, 6, 7].map(f => {
    const passed = r === 7 || f < r, cut = f === r && r !== 7, arrived = r === 7 && f === 7;
    return h("div", {
      display: "flex", justifyContent: "center", alignItems: "center", width: 84, height: 50, marginRight: f === 7 ? 0 : 10,
      fontSize: 24, fontWeight: 700,
      color: arrived ? "#e4e0d3" : cut ? RED : passed ? INK : FAINT,
      background: arrived ? INK : "transparent",
      border: `2px solid ${arrived ? INK : cut ? RED : passed ? INK : FAINT}`,
      textDecoration: cut ? "line-through" : "none",
    }, `${f}F`);
  });
  return h("div", { display: "flex", marginTop: 30 }, ...cells);
}

// result: 7 / 2〜6 / null(トップページ用)
export async function renderCard({ lang, result, photo, fonts }) {
  const t = T[lang], ja = lang === "ja", top = result == null, home = result === 7;
  const sz = ja ? { log: 30, logLs: 4, res: home ? 54 : 46, title: 50 } : { log: 24, logLs: 2, res: home ? 50 : 42, title: 50 };

  const body = top
    ? [
        h("div", { display: "flex", marginTop: 36, fontSize: sz.title, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap" }, t.title),
        h("div", { display: "flex", marginTop: 22, fontSize: 26, color: SUB, lineHeight: 1.55 }, t.lead),
      ]
    : [
        h("div", { display: "flex", marginTop: 34, fontSize: sz.res, fontWeight: 700, color: home ? INK : RED, lineHeight: 1.2, whiteSpace: "nowrap" }, resultText(lang, result)),
        floorStrip(result),
      ];

  const paper = h("div", {
    display: "flex", flexDirection: "column", width: 672, height: 518, padding: "40px 46px", background: "#e4e0d3", color: INK,
    boxShadow: "0 20px 60px rgba(0,0,0,.7)",
  },
    h("div", { display: "flex", borderBottom: `2px solid ${INK}`, paddingBottom: 12 },
      h("div", { fontSize: sz.log, fontWeight: 700, letterSpacing: sz.logLs, whiteSpace: "nowrap" }, t.log)),
    ...body,
    h("div", { display: "flex", marginTop: "auto", borderTop: "1px dashed #8a877f", paddingTop: 18, fontSize: 32, fontWeight: 700 }, t.invite),
  );

  const img = h("img", { width: 456, height: 630, objectFit: "cover" });
  img.props.src = photo;
  const root = h("div", { display: "flex", width: 1200, height: 630, background: "#0b0b0c", fontFamily: "NotoSansJP" },
    h("div", { display: "flex", flexDirection: "column", width: 744, height: 630, padding: "40px 0 0 56px" },
      paper,
      // 日本語は題名とハッシュタグが同じ文字なので、ハッシュタグだけにする
      h("div", { display: "flex", marginTop: 16, fontSize: 20, color: "#8d8d88" }, t.tag === `#${t.title}` ? t.tag : `${t.title}  ${t.tag}`)),
    img,
  );

  await wasmReady;
  const svg = await satori(root, {
    width: 1200, height: 630,
    fonts: [
      { name: "NotoSansJP", data: fonts[400], weight: 400, style: "normal" },
      { name: "NotoSansJP", data: fonts[700], weight: 700, style: "normal" },
    ],
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}

export { RESULTS };
