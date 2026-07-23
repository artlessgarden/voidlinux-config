#!/usr/bin/env bash

current=$(gsettings get org.gnome.desktop.interface color-scheme)

if [[ "$current" == "'prefer-dark'" ]]; then
	gsettings set org.gnome.desktop.interface color-scheme 'default'
	message="GTK 浅色"
else
	gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
	message="GTK 深色"
fi

command -v notify-send >/dev/null 2>&1 && notify-send "Theme" "$message"
echo "$message"
