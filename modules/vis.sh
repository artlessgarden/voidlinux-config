#!/bin/sh
# 功能：从官方 master 构建完整 Vis，并链接编辑器配置
# 生效：重新打开 Vis；不打断已打开的编辑器
set -eu

repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
src=$HOME/.local/src/vis
prefix=$HOME/.local

sudo xbps-install -Sy \
	git gcc make pkg-config \
	ncurses-devel \
	lua54-devel lua54-lpeg \
	tre-devel acl-devel

mkdir -p "$(dirname "$src")"
if [ -d "$src/.git" ]; then
	git -C "$src" pull --ff-only
else
	git clone --depth=1 https://github.com/martanne/vis.git "$src"
fi

# 在 /tmp 编译原版源码，不修改保存的源码目录。
work=$(mktemp -d /tmp/vis.XXXXXX)
git clone --quiet --local "$src" "$work/source"
cd "$work/source"
./configure --prefix="$prefix" --enable-curses=yes --enable-lua=yes \
	--disable-lpeg-static --enable-tre=yes --enable-acl=yes
make -j2
make install DESTDIR="$work/install"

# 最后原子替换编辑器，已打开的 Vis 可以继续运行。
staged=$work/install$prefix
mv "$staged/bin/vis" "$work/vis"
mkdir -p "$prefix/bin"
cp -a "$staged/." "$prefix/"
pending=$prefix/bin/vis.new
install -m 755 "$work/vis" "$pending"
mv -f "$pending" "$prefix/bin/vis"
mkdir -p "$HOME/.config" "$HOME/.local/share/applications"
ln -sfnT "$repo/root/home/.config/vis" "$HOME/.config/vis"
ln -sfn "$repo/root/home/.local/share/applications/vis.desktop" "$HOME/.local/share/applications/vis.desktop"
"$prefix/bin/vis" -v
printf '%s\n' 'Vis 已安装；重新打开 Vis 即使用新版本。'
