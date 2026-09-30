// コード描画(SVG)案のモック。base と anomaly は同じ関数で描き、異変だけ切り替える。
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const W = 360, H = 640;
const L = 40, R = 320, T = 77, B = 512; // エレベーター扉の開口部
const VP = { x: 180, y: 250 };           // 消失点
const sc = (z) => 1 / (1 + z);           // 奥行き z → 縮尺
const px = (X, z) => VP.x + (X - VP.x) * sc(z);
const py = (Y, z) => VP.y + (Y - VP.y) * sc(z);
const poly = (pts, fill, extra = "") =>
  `<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" fill="${fill}" ${extra}/>`;

const C = {
  frame: "#1a1c1e", frameEdge: "#3a3f44", sky: "#0b1220", ceiling: "#2a2f2c",
  floor: "#3b3d36", wallR: "#6d746a", wallL: "#4d544c", rail: "#7a8177",
  door: "#4f5a5e", doorEdge: "#2c3336", light: "#e8f5e4", far: "#050606",
  plant: "#2f4a33", pot: "#5a4636", umbrella: "#1f2b3a", finger: "#e9e4dc",
};

const ZFAR = 7;
const DOOR_H = 0.72;  // 床から天井までに対するドア高さ
const RAIL_H = 0.33;

function scene(anomaly) {
  const o = [];
  o.push(`<rect width="${W}" height="${H}" fill="${C.frame}"/>`);
  // 夜空(左の手すり壁の上)
  o.push(`<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="${C.sky}"/>`);
  // 天井
  o.push(poly([[L, T], [R, T], [px(R, ZFAR), py(T, ZFAR)], [px(L, ZFAR), py(T, ZFAR)]], C.ceiling));
  // 床
  o.push(poly([[L, B], [R, B], [px(R, ZFAR), py(B, ZFAR)], [px(L, ZFAR), py(B, ZFAR)]], C.floor));
  // 右の壁
  o.push(poly([[R, T], [px(R, ZFAR), py(T, ZFAR)], [px(R, ZFAR), py(B, ZFAR)], [R, B]], C.wallR));
  // 左の手すり壁
  const railY = B - (B - T) * RAIL_H;
  o.push(poly([[L, railY], [px(L, ZFAR), py(railY, ZFAR)], [px(L, ZFAR), py(B, ZFAR)], [L, B]], C.wallL));
  o.push(`<polyline points="${L},${railY} ${px(L, ZFAR)},${py(railY, ZFAR)}" stroke="${C.rail}" stroke-width="3" fill="none"/>`);
  // 左の柱
  for (let z = 0.3; z < ZFAR; z += 1.2) {
    const w = 0.12;
    o.push(poly([[px(L, z), py(T, z)], [px(L, z + w), py(T, z + w)], [px(L, z + w), py(railY, z + w)], [px(L, z), py(railY, z)]], C.wallL));
  }
  // 奥の闇
  o.push(`<rect x="${px(L, ZFAR)}" y="${py(T, ZFAR)}" width="${px(R, ZFAR) - px(L, ZFAR)}" height="${py(B, ZFAR) - py(T, ZFAR)}" fill="${C.far}"/>`);
  // 右のドア列
  const doorTop = B - (B - T) * DOOR_H;
  const doors = [];
  for (let i = 0; i < 6; i++) {
    const z1 = 0.12 + 0.8 * i, z2 = z1 + 0.42;
    doors.push([z1, z2]);
    o.push(poly([[px(R, z1), py(doorTop, z1)], [px(R, z2), py(doorTop, z2)], [px(R, z2), py(B, z2)], [px(R, z1), py(B, z1)]], C.door, `stroke="${C.doorEdge}" stroke-width="1"`));
    { const zk = z2 - 0.06, ky = doorTop + (B - doorTop) * 0.5; o.push(`<circle cx="${px(R, zk) - 3 * sc(zk)}" cy="${py(ky, zk)}" r="${5 * sc(zk)}" fill="#b9bdb4"/>`); }
    // 表札
    const zn = z2 + 0.05, zn2 = z2 + 0.14, ny = doorTop + (B - doorTop) * 0.25;
    o.push(poly([[px(R, zn), py(ny, zn)], [px(R, zn2), py(ny, zn2)], [px(R, zn2), py(ny + 14, zn2)], [px(R, zn), py(ny + 14, zn)]], "#9aa196"));
  }
  // 蛍光灯(1本だけ暗い)
  for (let z = 0.4, k = 0; z < ZFAR; z += 1.2, k++) {
    const hw = 22, d = 0.1;
    const dim = k === 2;
    o.push(poly([[px(VP.x - hw, z), py(T, z)], [px(VP.x + hw, z), py(T, z)], [px(VP.x + hw, z + d), py(T, z + d)], [px(VP.x - hw, z + d), py(T, z + d)]], dim ? "#6f7a6c" : C.light, dim ? "" : `filter="url(#glow)"`));
  }
  // 2番目のドア脇の鉢植え
  {
    const z = doors[1][1] + 0.2, x = px(R - 22, z), y = py(B, z), s = sc(z);
    o.push(`<rect x="${x - 10 * s}" y="${y - 22 * s}" width="${20 * s}" height="${22 * s}" fill="${C.pot}"/>`);
    o.push(`<ellipse cx="${x}" cy="${y - 36 * s}" rx="${22 * s}" ry="${20 * s}" fill="${C.plant}"/>`);
  }
  // 傘(左の壁に立てかけ)
  {
    const z = doors[1][1] + 0.34, x = px(R - 10, z), y = py(B, z), s = sc(z);
    o.push(`<line x1="${x - 14 * s}" y1="${y}" x2="${x}" y2="${y - 120 * s}" stroke="${C.umbrella}" stroke-width="${7 * s}" stroke-linecap="round"/>`);
  }
  // 異変: 手前から3番目のドアがわずかに開き、白い指が縁をつかむ
  if (anomaly) {
    const [z1] = doors[2];
    const gap = 0.06;
    o.push(poly([[px(R, z1), py(doorTop, z1)], [px(R, z1 + gap), py(doorTop, z1 + gap)], [px(R, z1 + gap), py(B, z1 + gap)], [px(R, z1), py(B, z1)]], "#000"));
    const s = sc(z1 + gap), gx = px(R, z1 + gap), my = py(doorTop + (B - doorTop) * 0.5, z1 + gap);
    for (let f = 0; f < 4; f++) {
      o.push(`<rect x="${gx - 8 * s}" y="${my + f * 15 * s}" width="${24 * s}" height="${10 * s}" rx="${5 * s}" fill="${C.finger}"/>`);
    }
  }
  // エレベーター扉枠
  o.push(`<rect x="${L - 6}" y="${T - 4}" width="${R - L + 12}" height="${B - T + 8}" fill="none" stroke="${C.frameEdge}" stroke-width="8"/>`);
  // 床の敷居
  o.push(`<rect x="0" y="${B}" width="${W}" height="${H - B}" fill="#22262a"/>`);
  o.push(`<rect x="${L - 10}" y="${B + 4}" width="${R - L + 20}" height="10" fill="#555c61"/>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">
<defs>
  <filter id="glow" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.08 0"/></filter>
  <radialGradient id="vig" cx="50%" cy="42%" r="70%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.65"/></radialGradient>
</defs>
${o.join("\n")}
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect width="${W}" height="${H}" filter="url(#grain)"/>
</svg>`;
}

const dir = fileURLToPath(new URL(".", import.meta.url));
writeFileSync(dir + "vector-base.svg", scene(false));
writeFileSync(dir + "vector-anomaly.svg", scene(true));
console.log("written");
