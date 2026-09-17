#!/bin/sh
# 功能：Fcitx5、Rime 和 Nord 候选主题
# 生效：重新登录 Niri
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S fcitx5 fcitx5-rime
mkdir -p "$HOME/.config/fcitx5/conf" "$HOME/.local/share/fcitx5/rime" "$HOME/.local/share/fcitx5/themes"
for name in profile config; do
    ln -sfn "$h/.config/fcitx5/$name" "$HOME/.config/fcitx5/$name"
done
ln -sfn "$h/.config/fcitx5/conf/classicui.conf" "$HOME/.config/fcitx5/conf/classicui.conf"
for source in "$h/.local/share/fcitx5/rime/"*; do
    ln -sfn "$source" "$HOME/.local/share/fcitx5/rime/"
done
ln -sfnT "$h/.local/share/fcitx5/themes/Nord-Dark" "$HOME/.local/share/fcitx5/themes/Nord-Dark"
