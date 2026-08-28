#!/bin/sh
# 链 home：shell、Wayland 会话、输入法
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
h=$dir/home

mkdir -p "$HOME/.config/fcitx5" "$HOME/.config/pipewire/pipewire.conf.d"

ln -sfn /usr/share/examples/wireplumber/10-wireplumber.conf \
	"$HOME/.config/pipewire/pipewire.conf.d/"
ln -sfn /usr/share/examples/pipewire/20-pipewire-pulse.conf \
	"$HOME/.config/pipewire/pipewire.conf.d/"
ln -sfn "$h/.bash_profile" "$HOME/.bash_profile"
ln -sfn "$h/.bashrc" "$HOME/.bashrc"
ln -sfn "$h/.inputrc" "$HOME/.inputrc"

ln -sfnT "$h/.config/niri" "$HOME/.config/niri"
ln -sfnT "$h/.config/river" "$HOME/.config/river"
ln -sfnT "$h/.config/tri" "$HOME/.config/tri"
ln -sfnT "$h/.config/xdg-desktop-portal" "$HOME/.config/xdg-desktop-portal"
ln -sfn "$h/.config/fcitx5/profile" "$HOME/.config/fcitx5/profile"
