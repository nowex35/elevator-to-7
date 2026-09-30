#!/bin/zsh
# 異変パーツ抽出: 基本版と異変版の差分のうち最大の塊だけをマスクにし、異変版の画素に透過を付ける。
# 出力は背景と同じキャンバスサイズ(位置合わせ不要で重ねられる)。
# usage: extract-part.sh <base> <anomaly> <out.png> [min_area]
set -e
base=$1 anom=$2 out=$3 min=${4:-3000} th=${5:-9}
tmp=$(mktemp -d)
magick "$base" "$anom" -compose difference -composite -colorspace gray -threshold ${th}% \
  -morphology open square:2 -morphology close disk:6 "$tmp/raw.png"
magick "$tmp/raw.png" -define connected-components:area-threshold=$min \
  -define connected-components:mean-color=true -connected-components 8 "$tmp/cc.png"
magick "$tmp/cc.png" -morphology dilate disk:8 -blur 0x4 "$tmp/mask.png"
magick "$anom" "$tmp/mask.png" -alpha off -compose copy_opacity -composite "$out"
magick "$out" -format "bbox=%@\n" info:
rm -rf "$tmp"
