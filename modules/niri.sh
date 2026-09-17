#!/bin/sh
# 功能：Niri 会话、窗口布局、亮度键、壁纸和色温
# 生效：配置自动重载；seatd 组及自启需重新登录
# 前提：Shell 提供 ni；按需先运行 terminal、input-method、audio、idle-lock、mouseless、launcher、screenshot；显卡用对应 modules/asus 或 modules/msi 模块
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S niri dbus seatd swaybg wlsunset brightnessctl xdg-utils gnome-themes-extra glib
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/seatd /var/service/seatd
sudo usermod -aG _seatd "$USER"
ln -sfnT "$h/.config/niri" "$HOME/.config/niri"
niri validate --config "$h/.config/niri/config.kdl"
