-- 1回のプレイ(7階に帰り着いた/ドボンした時点で1行)
CREATE TABLE runs (
  id           TEXT PRIMARY KEY,      -- シェア用の短いID
  seed         INTEGER NOT NULL,      -- 夜の番号(同じ seed = 同じ夜)
  lang         TEXT NOT NULL,
  home         INTEGER NOT NULL,      -- 1 = 7階に帰り着いた / 0 = ドボン
  reached      INTEGER NOT NULL,      -- 最後にいた階
  score        INTEGER NOT NULL,      -- ドボンなら 0
  rarest       TEXT,                  -- 最も珍しい記録の現象キー
  rarest_stars INTEGER,
  created_at   INTEGER NOT NULL
);
CREATE INDEX idx_runs_seed ON runs(seed);
CREATE INDEX idx_runs_home_score ON runs(home, score);

-- 開けて判断した階ごとの記録(「この異変に気づけた人は◯%」の集計用)
CREATE TABLE encounters (
  run_id   TEXT NOT NULL,
  floor    INTEGER NOT NULL,
  key      TEXT NOT NULL,             -- 現象キー(異変名 / R_住人 / QUIET / WAKE_LINE)
  anomaly  INTEGER NOT NULL,          -- 1 = 異変
  correct  INTEGER NOT NULL           -- 1 = 正しく判断した
);
CREATE INDEX idx_enc_key ON encounters(key, anomaly);
