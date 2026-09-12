#!/bin/sh
# Link only active common application configuration.
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
h=$dir/root/home

mkdir -p "$HOME/.config" "$HOME/.local/bin" \
	"$HOME/.local/share/applications" \
	"$HOME/.local/share/fcitx5/rime"

ln -sfn "$h/.npmrc" "$HOME/.npmrc"
for name in alacritty emacs nvim fd fontconfig htop lf vis mpv mouseless xdg-desktop-portal xdg-desktop-portal-termfilechooser; do
	ln -sfnT "$h/.config/$name" "$HOME/.config/$name"
done

# 配置、书签、快速书签和 :set 偏好随仓库保存。
mkdir -p "$HOME/.config/qutebrowser/bookmarks"
for file in config.py autoconfig.yml quickmarks bookmarks/urls; do
	qute=$HOME/.config/qutebrowser/$file
	if [ -f "$qute" ] && [ ! -L "$qute" ]; then
		mv "$qute" "$qute.before-repo-$(date +%Y%m%d%H%M%S)"
	fi
	ln -sfn "$h/.config/qutebrowser/$file" "$qute"
done

chmod +x "$h/.local/bin/"* 2>/dev/null || true
ln -sf "$h/.local/bin/"* "$HOME/.local/bin/"
ln -sfn "$h/.local/share/applications/helium.desktop" \
	"$HOME/.local/share/applications/helium.desktop"
ln -sfn "$h/.local/share/applications/lf.desktop" \
	"$HOME/.local/share/applications/lf.desktop"
ln -sfn "$h/.local/share/applications/vis.desktop" \
	"$HOME/.local/share/applications/vis.desktop"
ln -sf "$h/.local/share/fcitx5/rime/"* "$HOME/.local/share/fcitx5/rime/"

mkdir -p "$HOME/.local/share/dbus-1/services"
ln -sfn "$h/.local/share/dbus-1/services/org.freedesktop.FileManager1.service" \
    "$HOME/.local/share/dbus-1/services/org.freedesktop.FileManager1.service"

# Helium policy and initial preferences are common; only the default browser differs.
sudo install -d -o root -g root -m 755 \
	/etc/chromium/policies/managed /etc/chromium/policies/recommended
sudo install -o root -g root -m 644 \
	"$dir/root/etc/chromium/policies/managed/extensions.json" \
	/etc/chromium/policies/managed/extensions.json
sudo install -o root -g root -m 644 \
	"$dir/root/etc/chromium/policies/recommended/helium.json" \
	/etc/chromium/policies/recommended/helium.json
"$h/.local/bin/helium-seed-prefs" || true
printf '%s\n' '应用配置已链接；正在运行的应用需重新打开。'
