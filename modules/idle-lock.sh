#!/bin/sh
# 功能：闲置锁屏和关闭屏幕，不自动休眠
# 生效：重新登录 Niri
# 前提：niri.sh：公共 Niri 配置保存锁屏图片及自启命令
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S swayidle swaylock
