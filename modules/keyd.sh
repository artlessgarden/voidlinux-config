#!/bin/sh
# 功能：键盘映射
# 生效：服务启用后；已运行时 reload
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S keyd
sudo install -d /etc/keyd
sudo install -m 644 "$repo/root/etc/keyd/"*.conf /etc/keyd/
sudo ln -sfn /etc/sv/keyd /var/service/keyd
if sudo sv status keyd 2>/dev/null | grep -q '^run:'; then
    sudo keyd reload
fi
