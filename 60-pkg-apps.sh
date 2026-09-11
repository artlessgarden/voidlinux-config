#!/bin/sh
# Daily terminal desktop applications shared by both hosts.
set -eu

sudo xbps-install -S \
	firefox \
	grim slurp swappy \
	imv mpv zathura zathura-pdf-poppler \
	gvfs xdg-desktop-portal-termfilechooser xdg-desktop-portal-gtk xdg-utils gnome-themes-extra \
	lf fuzzel python3-dbus python3-gobject curl fd fzf ripgrep bat chafa htop xz \
	file mediainfo-cli poppler-utils unzip zip 7zip \
	StyLua shfmt ruff go nodejs \
	telegram-desktop
printf '%s\n' '应用软件包已安装；程序可立即运行。'
