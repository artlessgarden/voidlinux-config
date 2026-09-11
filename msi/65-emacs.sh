#!/bin/sh
# Restore the archived Emacs setup in the XDG configuration directory.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
mkdir -p "$HOME/.config"
target=$HOME/.config/emacs
if [ -e "$target" ] && [ ! -L "$target" ]; then
	printf '已有配置目录，请先移走再运行：%s\n' "$target" >&2
	exit 1
fi
sudo xbps-install -y emacs-pgtk
ln -sfnT "$repo/root/home/.config/emacs" "$target"
sh "$repo/55-mimeapps.sh"
xdg-mime default emacs.desktop text/org
printf '%s\n' 'Emacs 配置已恢复到 ~/.config/emacs；首次启动会安装原配置的插件。'
