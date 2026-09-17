#!/bin/sh
# 功能：系统时间同步
# 生效：服务启用后
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S chrony
sudo ln -sfn /etc/sv/chronyd /var/service/chronyd
