#!/bin/sh
# 功能：LF、文件选择器及默认打开方式
# 前提：03-desktop/terminal-fonts.sh 提供终端；vis.sh 提供文本编辑器；媒体工具按需安装
# 生效：新 LF／新文件选择器；不重启当前 portal
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
h=$repo/root/home

# --- LF 与文件选择器 ---
mkdir -p "$HOME/.config"
sudo xbps-install -Sy -y lf fzf file wl-clipboard xdg-utils xdg-desktop-portal-termfilechooser
ln -sfnT "$h/.config/lf" "$HOME/.config/lf"
ln -sfnT "$h/.config/xdg-desktop-portal" "$HOME/.config/xdg-desktop-portal"
ln -sfnT "$h/.config/xdg-desktop-portal-termfilechooser" "$HOME/.config/xdg-desktop-portal-termfilechooser"
chmod +x "$h/.config/lf/preview" "$h/.config/lf/scripts/"*
mkdir -p "$HOME/.local/share/applications"
ln -sfn "$h/.local/share/applications/lf.desktop" "$HOME/.local/share/applications/lf.desktop"

# --- 默认打开方式 ---
ln -sfn "$h/.config/mimeapps.list" "$HOME/.config/mimeapps.list"
