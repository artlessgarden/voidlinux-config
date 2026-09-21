#!/bin/sh
# 功能：Fcitx5 Chinese Addons
# 生效：重新登录 Niri
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
h=$repo/root/home
sudo xbps-install -Sy -y fcitx5 fcitx5-chinese-addons
mkdir -p "$HOME/.config/fcitx5/conf"
ln -sfn "$h/.config/fcitx5/profile" "$HOME/.config/fcitx5/profile"
ln -sfn "$h/.config/fcitx5/config" "$HOME/.config/fcitx5/config"
for source in "$h/.config/fcitx5/conf/"*.conf; do
	ln -sfn "$source" "$HOME/.config/fcitx5/conf/$(basename "$source")"
done
