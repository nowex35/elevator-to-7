// 7階行きのエレベーター — 記録の保存と順位
//   POST /api/runs        1回のプレイ結果を保存し、順位を返す
//   GET  /api/stats       順位だけ返す(?score=&home=1)
// シェア用のページ(/s/*)とカード画像(/og/*)は、scripts/build-cards.mjs が作る静的ファイル。Worker を通らない。

// 現象キーの許可リスト(ゲーム側の PTS と揃える)
const KEYS = new Set([
  "QUIET", "WAKE_LINE",
  "R_a", "R_salary", "R_pajama", "R_deliv", "R_kid", "R_hood", "R_monk", "R_granny", "R_woman", "R_mourner", "R_funeral",
  "SHOES", "OLDMAN", "WRONG_FLOOR", "MOURNER_OFF6", "LIGHTS_OUT", "FINGERS", "INDICATOR_13", "CAPTION_707", "PROP_FOLLOW",
  "OJISAN_NO_NOD", "KID_NOBUTTON", "MONK_7", "DELIV_LABEL", "REBOARD", "ALL_BUTTONS", "HOME_EARLY",
  "OJISAN_BACK", "KID_BACK",
  "APPROACH", "DOORS_AJAR", "PLATE_SWAP", "IND_STUCK", "BAREFOOT", "PRESS_4",
]);
const MAX_SCORE = 1_000_000; // これを超える点は、まともなプレイでは出ない

// 順位の出し方(migrations/0003 の度数表と揃える)
const BUCKET = 500;        // 度数表の幅(点)
const EXACT_BELOW = 2000;  // 帰り着いた人がこれより少ないうちは、正確に数える

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

// 読み間違えにくい文字だけで記録のIDを作る
function newId() {
  const abc = "23456789abcdefghjkmnpqrstuvwxyz";
  const b = crypto.getRandomValues(new Uint8Array(8));
  return [...b].map(x => abc[x % abc.length]).join("");
}

function validRun(r) {
  if (!r || typeof r !== "object") return "body";
  if (!Number.isInteger(r.seed) || r.seed < 1 || r.seed > 0xffffffff) return "seed";
  if (!["ja", "en"].includes(r.lang)) return "lang";
  if (typeof r.home !== "boolean") return "home";
  if (!Number.isInteger(r.reached) || r.reached < 1 || r.reached > 7) return "reached";
  if (!Number.isInteger(r.score) || r.score < 0 || r.score > MAX_SCORE) return "score";
  if (!r.home && r.score !== 0) return "score"; // ドボンしたらスコアは 0
  if (!Array.isArray(r.encounters) || r.encounters.length > 5) return "encounters";
  for (const e of r.encounters) {
    if (!Number.isInteger(e.floor) || e.floor < 2 || e.floor > 6) return "encounters.floor";
    if (!KEYS.has(e.key)) return "encounters.key";
    if (typeof e.anomaly !== "boolean" || typeof e.correct !== "boolean") return "encounters.flags";
  }
  return null;
}

// 7階に帰り着いた人の中での順位
async function rank(db, score) {
  const b = Math.floor(score / BUCKET);
  const h = await db.prepare(
    "SELECT COALESCE(SUM(n), 0) AS total, COALESCE(SUM(CASE WHEN bucket > ?1 THEN n END), 0) AS higher, COALESCE(SUM(CASE WHEN bucket = ?1 THEN n END), 0) AS same FROM score_hist"
  ).bind(b).first();
  if (!h.total) return null;
  let higher;
  if (h.total < EXACT_BELOW) {
    higher = (await db.prepare("SELECT COUNT(*) AS c FROM runs WHERE home = 1 AND score > ?").bind(score).first()).c;
  } else {
    // 同じ区間の中では、点が均等に散らばっていると見なす(この人数なら「上位◯%」しか出さないので十分)
    higher = h.higher + Math.round(h.same * (1 - (score % BUCKET + .5) / BUCKET));
  }
  const place = Math.min(higher + 1, h.total); // /api/stats で保存していない点を聞かれても、総数を超えない
  return { total: h.total, place, topPercent: Math.max(1, Math.ceil(place / h.total * 100)) };
}

async function saveRun(req, env) {
  let r;
  try { r = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const bad = validRun(r);
  if (bad) return json({ error: `invalid ${bad}` }, 400);
  const enc = JSON.stringify(r.encounters.map(({ floor, key, anomaly, correct }) => [floor, key, anomaly ? 1 : 0, correct ? 1 : 0]));
  const stmts = [
    env.DB.prepare("INSERT INTO runs (id, seed, lang, home, reached, score, enc, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(newId(), r.seed, r.lang, r.home ? 1 : 0, r.reached, r.score, enc, Date.now()),
  ];
  if (r.home) stmts.push(env.DB.prepare("INSERT INTO score_hist (bucket, n) VALUES (?, 1) ON CONFLICT(bucket) DO UPDATE SET n = n + 1").bind(Math.floor(r.score / BUCKET)));
  await env.DB.batch(stmts);
  return json({ rank: r.home ? await rank(env.DB, r.score) : null });
}

async function getStats(url, env) {
  const score = Number(url.searchParams.get("score"));
  const ok = url.searchParams.get("home") === "1" && Number.isInteger(score) && score >= 0;
  return json({ rank: ok ? await rank(env.DB, score) : null });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === "/api/runs" && req.method === "POST") return await saveRun(req, env);
      if (url.pathname === "/api/stats" && req.method === "GET") return await getStats(url, env);
      if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
      return env.ASSETS.fetch(req);
    } catch (e) {
      console.error(e);
      return json({ error: "server error" }, 500);
    }
  },
};
