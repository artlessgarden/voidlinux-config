#!/bin/sh
# 功能：全屏／区域截图、剪贴板、Swappy
# 生效：立即可用
# 前提：niri.sh 提供快捷键
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S grim slurp swappy wl-clipboard
