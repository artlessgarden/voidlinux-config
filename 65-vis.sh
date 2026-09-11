#!/bin/sh
# 从官方 master 构建 vis 到用户目录；系统 XBPS 不安装 vis 包。
set -eu

src=$HOME/.local/src/vis
prefix=$HOME/.local
repo=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

sudo xbps-install -Sy \
	base-devel pkg-config python3 \
	ncurses-devel \
	lua54-devel lua54-lpeg \
	tre-devel acl-devel

mkdir -p "$(dirname "$src")"
if [ -d "$src/.git" ]; then
	git -C "$src" pull --ff-only
else
	git clone --depth=1 https://github.com/martanne/vis.git "$src"
fi

# Build upstream without local patches, keeping the source checkout clean.
python3 "$repo/apps/vis-cjk/build.py" --source "$src" --prefix "$prefix"
