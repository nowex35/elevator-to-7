-- 集計と保存を D1 の無料枠に収める(読み込み 500万行/日・書き込み 10万行/日。索引の更新も1行の書き込みに数える)
--   1回のプレイで書く行: ドボン 1行 / 帰り着いた 3行(runs・索引・度数表)
--   順位を出すときに読む行: 度数表(最大でも数百行)+ 帰り着いた人が少ないうちだけ正確な数え上げ

-- 開けて判断した階の記録は、runs の1列(JSON)にまとめる。encounters 表には書かない
ALTER TABLE runs ADD COLUMN enc TEXT;

-- 同じ夜の集計はやめた(シェアから来た人も新しい夜を遊ぶ)
DROP INDEX idx_runs_seed;

-- 順位の数え上げ用。帰り着いた記録だけを索引に入れる(ドボンの記録は索引を書かない)
DROP INDEX idx_runs_home_score;
CREATE INDEX idx_runs_home_score ON runs(score) WHERE home = 1;

-- スコアの度数表(500点ごと)。帰り着いた人が多くなったら、順位はここから出す
CREATE TABLE score_hist (
  bucket INTEGER PRIMARY KEY,           -- score / 500
  n      INTEGER NOT NULL
);
INSERT INTO score_hist (bucket, n) SELECT score / 500, COUNT(*) FROM runs WHERE home = 1 GROUP BY score / 500;
