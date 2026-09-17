#!/bin/sh
# 功能：初始化本机打开方式，不覆盖已有选择
# 生效：立即
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
target=$HOME/.config/mimeapps.list
if [ ! -e "$target" ] && [ ! -L "$target" ]; then
    cp "$h/.config/mimeapps.list.example" "$target"
fi
printf '%s\n' '已有打开方式保持本机独立；新安装默认浏览器为 qutebrowser。'
