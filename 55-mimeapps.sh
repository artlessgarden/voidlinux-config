#!/bin/sh
# Seed per-host application defaults without sharing later browser choices.
set -eu

dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
template=$dir/root/home/.config/mimeapps.list.example
target=$HOME/.config/mimeapps.list
tmp=
trap '[ -z "$tmp" ] || rm -f "$tmp"' EXIT HUP INT TERM

mkdir -p "$HOME/.config"

# Detach the former repository symlink while preserving this host's choices.
if [ -L "$target" ]; then
	tmp=$(mktemp "$HOME/.config/.mimeapps.XXXXXX")
	if [ -f "$target" ]; then
		cp -L "$target" "$tmp"
	else
		cp "$template" "$tmp"
	fi
	rm "$target"
	mv "$tmp" "$target"
	tmp=
elif [ ! -e "$target" ]; then
	cp "$template" "$target"
fi

printf '%s\n' '本机默认应用已保留；以后不会与其他设备同步。'
