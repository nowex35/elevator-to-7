-- 最も珍しい記録の名前を組み立てるための引数(人物キーか置き物キー。例: WRONG_FLOOR の「誰が」)
ALTER TABLE runs ADD COLUMN rarest_arg TEXT;
