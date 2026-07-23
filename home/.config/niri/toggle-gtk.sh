#!/usr/bin/env bash

current=$(gsettings get org.gnome.desktop.interface color-scheme)
state_file="${XDG_CACHE_HOME:-$HOME/.cache}/config-theme"
mkdir -p "$(dirname "$state_file")"

if [[ "$current" == "'prefer-dark'" ]]; then
	mode=light
else
	mode=dark
fi

case "$mode" in
	light)
		gsettings set org.gnome.desktop.interface color-scheme 'default'
		printf '%s\n' light >"$state_file"
		sed -i 's/import = \["[^"]*\.toml"\]/import = ["light.toml"]/' "$HOME/.config/alacritty/alacritty.toml"
		sed -i 's/^initial-color-theme=.*/initial-color-theme=light/' "$HOME/.config/foot/foot.ini"
		message="切换为浅色"
		;;
	dark)
		gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
		printf '%s\n' dark >"$state_file"
		sed -i 's/import = \["[^"]*\.toml"\]/import = ["dark.toml"]/' "$HOME/.config/alacritty/alacritty.toml"
		sed -i 's/^initial-color-theme=.*/initial-color-theme=dark/' "$HOME/.config/foot/foot.ini"
		message="切换为深色"
		;;
esac

command -v notify-send >/dev/null 2>&1 && notify-send "Theme" "$message"
echo "$message"
