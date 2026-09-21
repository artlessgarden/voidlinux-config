#!/bin/sh
# 功能：Fcitx5 Chinese Addons
# 生效：重新登录 Niri
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
h=$repo/root/home
sudo xbps-install -S fcitx5 fcitx5-chinese-addons
mkdir -p "$HOME/.config/fcitx5/conf"
ln -sfn "$h/.config/fcitx5/profile" "$HOME/.config/fcitx5/profile"
ln -sfn "$h/.config/fcitx5/config" "$HOME/.config/fcitx5/config"
ln -sfn "$h/.config/fcitx5/conf/classicui.conf" "$HOME/.config/fcitx5/conf/classicui.conf"
ln -sfn "$h/.config/fcitx5/conf/clipboard.conf" "$HOME/.config/fcitx5/conf/clipboard.conf"
