#!/bin/sh
# 功能：字体与字体选择
# 生效：重新打开应用
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S font-inconsolata-otf wqy-microhei
ln -sfnT "$h/.config/fontconfig" "$HOME/.config/fontconfig"
fc-cache -f
