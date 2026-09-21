#!/bin/sh
# 功能：PipeWire、WirePlumber、蓝牙及蓝牙音频
# 生效：服务设置即时生效；新音频组件需重新登录
set -eu
sudo xbps-install -S pipewire wireplumber alsa-pipewire bluez libspa-bluetooth dbus
mkdir -p "$HOME/.config/pipewire/pipewire.conf.d"
ln -sfn /usr/share/examples/wireplumber/10-wireplumber.conf "$HOME/.config/pipewire/pipewire.conf.d/10-wireplumber.conf"
ln -sfn /usr/share/examples/pipewire/20-pipewire-pulse.conf "$HOME/.config/pipewire/pipewire.conf.d/20-pipewire-pulse.conf"
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/bluetoothd /var/service/bluetoothd
