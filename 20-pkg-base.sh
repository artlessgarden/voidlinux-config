#!/bin/sh
# 底座包（能 ni 起 niri）— ASUS FA401KM：AMD mesa-dri
sudo xbps-install -Syu
sudo xbps-install -S \
	mesa-dri mesa-vaapi mesa-vulkan-radeon \
	niri foot dbus seatd \
	swaybg swayidle swaylock wlsunset wl-clipboard brightnessctl \
	fcitx5 fcitx5-rime \
	alsa-utils keyd \
	bash-completion git fastfetch \
	font-inconsolata-otf wqy-microhei
