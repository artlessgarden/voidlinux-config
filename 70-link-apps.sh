#!/bin/sh
# Link only active common application configuration.
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
h=$dir/root/home

mkdir -p "$HOME/.config" "$HOME/.local/bin" \
	"$HOME/.local/share/applications" \
	"$HOME/.local/share/fcitx5/rime"

ln -sfn "$h/.npmrc" "$HOME/.npmrc"
for name in alacritty fd fontconfig htop mpv mouseless; do
	ln -sfnT "$h/.config/$name" "$HOME/.config/$name"
done

chmod +x "$h/.local/bin/"* 2>/dev/null || true
ln -sf "$h/.local/bin/"* "$HOME/.local/bin/"
ln -sfn "$h/.local/share/applications/vim.desktop" \
	"$HOME/.local/share/applications/vim.desktop"
ln -sf "$h/.local/share/fcitx5/rime/"* "$HOME/.local/share/fcitx5/rime/"

printf '%s\n' '应用配置已链接；正在运行的应用需重新打开。'
