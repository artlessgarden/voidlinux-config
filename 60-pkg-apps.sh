#!/bin/sh
# ni 之后：日常应用包（无 fuzzel / mako）
# Helium（非 xbps）需要 nss + nspr；截图注解用 satty（gtk4）。
sudo xbps-install -S \
	imv mpv zathura-pdf-poppler \
	grim slurp satty wl-kbptr niri-float-sticky \
	xdg-desktop-portal-termfilechooser xdg-utils lf \
	curl fd fzf htop vis xz \
	nss nspr
