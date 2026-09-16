#!/bin/sh
# 官方静态二进制；无需编译或安装 Rust。
set -eu
[ "$(uname -m)" = x86_64 ] || {
	echo '此脚本使用 Linux x86_64 二进制。' >&2
	exit 1
}
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
latest=$(curl -fsSL https://api.github.com/repos/YS-L/csvlens/releases/latest |
	sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p' | head -n 1)
case $latest in
v[0-9]*) ;;
*)
	echo '无法获取 csvlens 最新版本。' >&2
	exit 1
	;;
esac
archive=csvlens-x86_64-unknown-linux-musl.tar.xz
url=https://github.com/YS-L/csvlens/releases/download/$latest
curl -fL "$url/$archive" -o "$tmp/$archive"
curl -fL "$url/$archive.sha256" -o "$tmp/$archive.sha256"
(
	cd "$tmp"
	sha256sum -c "$archive.sha256"
	tar -xJf "$archive"
)
binary=$(find "$tmp" -type f -name csvlens -print -quit)
test -n "$binary"
"$binary" --version
mkdir -p "$HOME/.local/bin"
install -m 755 "$binary" "$HOME/.local/bin/csvlens.new"
mv -f "$HOME/.local/bin/csvlens.new" "$HOME/.local/bin/csvlens"
echo 'csvlens 已安装；LF 中打开 CSV/TSV 使用它。'
