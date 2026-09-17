#!/bin/sh
# 功能：换 Fastly 主源并启用 nonfree（装机已配可跳过）
# 生效：下次运行 XBPS；intel-ucode 等在 nonfree
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

sudo install -d /etc/xbps.d
sudo install -m 644 "$dir/root/etc/xbps.d/00-repository-main.conf" /etc/xbps.d/00-repository-main.conf
sudo install -m 644 "$dir/root/etc/xbps.d/20-nonfree.conf" /etc/xbps.d/20-nonfree.conf
printf '%s\n' 'XBPS 软件源已安装，下次运行 xbps-install 时使用。'
