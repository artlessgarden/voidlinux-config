#!/bin/sh
# PipeWire 音频 + BlueZ 蓝牙（连耳机自动切换，浏览器无需手动切设备）
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

sudo xbps-install -Sy bluez pipewire wireplumber alsa-pipewire libspa-bluetooth

sudo ln -sfn /etc/sv/bluetoothd /var/service/bluetoothd
sudo usermod -aG bluetooth,audio "$USER"

# 停用 bluez-alsa（与 PipeWire 蓝牙冲突）
sudo sv down bluez-alsa 2>/dev/null || true
sudo rm -f /var/service/bluez-alsa

# ALSA 默认走 PipeWire
sudo mkdir -p /etc/alsa/conf.d
sudo ln -sfn /usr/share/alsa/alsa.conf.d/50-pipewire.conf /etc/alsa/conf.d/
sudo ln -sfn /usr/share/alsa/alsa.conf.d/99-pipewire-default.conf /etc/alsa/conf.d/

# 用户 PipeWire 配置（wireplumber + pulse 兼容层）
mkdir -p "$HOME/.config/pipewire/pipewire.conf.d"
ln -sfn /usr/share/examples/wireplumber/10-wireplumber.conf \
	"$HOME/.config/pipewire/pipewire.conf.d/"
ln -sfn /usr/share/examples/pipewire/20-pipewire-pulse.conf \
	"$HOME/.config/pipewire/pipewire.conf.d/"

printf '音频已切到 PipeWire。重新登录后进 rv；连耳机后浏览器自动出声。\n'
