#!/bin/sh
# 从官方 master 构建 vis 到用户目录；系统 XBPS 不安装 vis 包。
set -eu

src=$HOME/.local/src/vis
prefix=$HOME/.local

sudo xbps-install -Sy \
	base-devel pkg-config \
	ncurses-devel \
	lua54-devel lua54-lpeg \
	tre-devel acl-devel

mkdir -p "$(dirname "$src")"
if [ -d "$src/.git" ]; then
	git -C "$src" pull --ff-only
else
	git clone --depth=1 https://github.com/martanne/vis.git "$src"
fi

# 在临时目录编译原版源码，测试通过后安装，不修改源码目录。
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT HUP INT TERM
git clone --quiet --local "$src" "$work/source"
cd "$work/source"
./configure --prefix="$prefix" --enable-curses=yes --enable-lua=yes \
	--disable-lpeg-static --enable-tre=yes --enable-acl=yes
make -j2
for suite in core lua vis; do
	make -C "test/$suite"
done
make install DESTDIR="$work/install"

# 最后原子替换编辑器，已打开的 Vis 可以继续运行。
staged=$work/install$prefix
mv "$staged/bin/vis" "$work/vis"
mkdir -p "$prefix/bin"
cp -a "$staged/." "$prefix/"
if [ -f "$prefix/bin/vis" ]; then
	cp -p "$prefix/bin/vis" "$prefix/bin/vis.previous"
fi
pending=$(mktemp "$prefix/bin/.vis-XXXXXX")
trap 'rm -rf "$work"; rm -f "$pending"' EXIT HUP INT TERM
install -m 755 "$work/vis" "$pending"
mv -f "$pending" "$prefix/bin/vis"
"$prefix/bin/vis" -v
printf '%s\n' 'Vis 已安装；重新打开 Vis 即使用新版本。'
