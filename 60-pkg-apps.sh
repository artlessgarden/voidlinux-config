#!/bin/sh
# ni 之后：日常应用包（无 fuzzel / mako）
# Helium（非 xbps）还需 nss；其余 gtk/at-spi 等由 swappy→gtk+3 带上。
sudo xbps-install -S \
	imv mpv zathura-pdf-poppler \
	grim slurp swappy wl-kbptr \
	xdg-desktop-portal-termfilechooser xdg-utils lf \
	curl fd fzf htop vis xz \
	nss
