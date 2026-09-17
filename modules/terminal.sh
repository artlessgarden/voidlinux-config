#!/bin/sh
# 功能：Alacritty 终端
# 生效：新终端
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S alacritty
ln -sfnT "$h/.config/alacritty" "$HOME/.config/alacritty"
