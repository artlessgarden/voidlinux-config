#!/bin/sh
# 功能：LF、文件选择器及默认打开方式
# 前提：03-desktop.sh 提供终端；vis.sh 提供文本编辑器；媒体工具按需安装
# 生效：新 LF／新文件选择器；不重启当前 portal
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
h=$repo/root/home

# --- LF 与文件选择器 ---
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S lf fd fzf ripgrep file wl-clipboard xdg-utils xdg-desktop-portal-termfilechooser
ln -sfnT "$h/.config/lf" "$HOME/.config/lf"
ln -sfnT "$h/.config/xdg-desktop-portal" "$HOME/.config/xdg-desktop-portal"
ln -sfnT "$h/.config/xdg-desktop-portal-termfilechooser" "$HOME/.config/xdg-desktop-portal-termfilechooser"
chmod +x "$h/.config/lf/preview" "$h/.config/lf/scripts/"*
mkdir -p "$HOME/.local/share/applications"
ln -sfn "$h/.local/share/applications/lf.desktop" "$HOME/.local/share/applications/lf.desktop"

# --- 默认打开方式 ---
target=$HOME/.config/mimeapps.list
if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    cp "$h/.config/mimeapps.list.example" "$target"
fi
printf '%s\n' '已有打开方式保持本机独立；新安装默认浏览器为 qutebrowser。'
