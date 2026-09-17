#!/bin/sh
# 功能：PipeWire、WirePlumber 和 PulseAudio 兼容接口
# 生效：重新登录 Niri；不重启当前音频
# 前提：niri.sh 启动用户 PipeWire
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S pipewire wireplumber alsa-pipewire
mkdir -p "$HOME/.config/pipewire/pipewire.conf.d"
for source in /usr/share/examples/wireplumber/10-wireplumber.conf /usr/share/examples/pipewire/20-pipewire-pulse.conf; do
    test -f "$source"
    ln -sfn "$source" "$HOME/.config/pipewire/pipewire.conf.d/"
done
