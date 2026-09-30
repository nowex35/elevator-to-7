#!/bin/zsh
# raw/<name>.png(緑背景)→ parts/<name>.png(透過・余白詰め)
set -e
for n in "$@"; do
  uv run -q --with pillow python ~/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
    --input raw/$n.png --out parts/$n.png --auto-key border --soft-matte --despill --edge-contract 1 >/dev/null
  magick parts/$n.png -trim +repage parts/$n.png
  echo "$n $(magick parts/$n.png -format '%wx%h' info:)"
done
