#!/bin/sh
# 功能：BlueZ 蓝牙及蓝牙音频支持
# 生效：服务启用后；新音频组件需重新登录
# 前提：audio.sh：蓝牙耳机；配对记录本机保存
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S bluez libspa-bluetooth
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/bluetoothd /var/service/bluetoothd
