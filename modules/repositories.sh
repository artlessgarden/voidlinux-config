#!/bin/sh
# 功能：Fastly 主源、nonfree 及忽略不用的 NVIDIA 固件
# 生效：下次运行 XBPS；intel-ucode 等在 nonfree
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

sudo install -d /etc/xbps.d
sudo install -m 644 "$dir/root/etc/xbps.d/00-repository-main.conf" /etc/xbps.d/00-repository-main.conf
sudo install -m 644 "$dir/root/etc/xbps.d/20-nonfree.conf" /etc/xbps.d/20-nonfree.conf
sudo install -m 644 "$dir/root/etc/xbps.d/30-ignore-nvidia.conf" /etc/xbps.d/30-ignore-nvidia.conf
printf '%s\n' 'XBPS 软件源已安装，下次运行 xbps-install 时使用。'
