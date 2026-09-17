#!/bin/sh
# 功能：LF 完整日常功能及终端文件选择器
# 生效：新 LF／新文件选择器；不重启当前 portal
# 前提：terminal.sh、vis.sh；打开方式用 mimeapps.sh；mpv/imv/zathura 按需手动安装
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S lf fd fzf ripgrep file wl-clipboard xdg-utils xdg-desktop-portal-termfilechooser
ln -sfnT "$h/.config/lf" "$HOME/.config/lf"
ln -sfnT "$h/.config/xdg-desktop-portal" "$HOME/.config/xdg-desktop-portal"
ln -sfnT "$h/.config/xdg-desktop-portal-termfilechooser" "$HOME/.config/xdg-desktop-portal-termfilechooser"
chmod +x "$h/.config/lf/preview" "$h/.config/lf/scripts/"*
mkdir -p "$HOME/.local/share/applications"
ln -sfn "$h/.local/share/applications/lf.desktop" "$HOME/.local/share/applications/lf.desktop"
