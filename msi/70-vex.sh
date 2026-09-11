#!/bin/sh
# Install the verified Vex release and set this host's spreadsheet defaults.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
version=2.1.0
checksum=6ab22ba15d47e52f8b66ebd3211688b25fe4eb7d5176ecc6bee5540963657941
bin=$HOME/.local/bin
applications=$HOME/.local/share/applications
tmp=
trap '[ -z "$tmp" ] || rm -rf "$tmp"' EXIT HUP INT TERM

[ "$(uname -m)" = x86_64 ] || { echo '此安装包仅适用于 x86_64。' >&2; exit 1; }
for command in curl sha256sum tar xdg-mime update-desktop-database alacritty; do
	command -v "$command" >/dev/null || {
		printf '缺少命令：%s\n' "$command" >&2
		exit 1
	}
done

if [ ! -x "$bin/vex" ] || [ "$("$bin/vex" --version | sed -n '1p')" != "vex version $version" ]; then
	tmp=$(mktemp -d)
	archive=vex-tui_"$version"_linux_amd64.tar.gz
	curl -fL "https://github.com/CodeOne45/vex-tui/releases/download/v$version/$archive" \
		-o "$tmp/$archive"
	printf '%s  %s\n' "$checksum" "$tmp/$archive" | sha256sum -c -
	tar -xzf "$tmp/$archive" -C "$tmp" vex
	[ "$("$tmp/vex" --version | sed -n '1p')" = "vex version $version" ]
	mkdir -p "$bin"
	install -m 755 "$tmp/vex" "$bin/vex"
fi

mkdir -p "$applications"
ln -sfn "$repo/root/home/.local/share/applications/vex.desktop" "$applications/vex.desktop"
update-desktop-database "$applications"
sh "$repo/55-mimeapps.sh"
for mime in text/csv \
	application/vnd.openxmlformats-officedocument.spreadsheetml.sheet \
	application/vnd.ms-excel.sheet.macroEnabled.12; do
	xdg-mime default vex.desktop "$mime"
done

printf '%s\n' 'Vex 2.1.0 已安装；CSV、XLSX、XLSM 默认用 Vex 打开，立即生效。' \
	'已有 LF 窗口需重新打开。此版本不支持 TSV 和旧版 XLS。'
