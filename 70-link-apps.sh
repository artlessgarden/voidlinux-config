#!/bin/sh
# ni 之后：应用配置与入口（含 Helium 策略文件）
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
h=$dir/home

mkdir -p \
	"$HOME/.config" \
	"$HOME/.config/nvim" \
	"$HOME/.emacs.d" \
	"$HOME/.local/bin" \
	"$HOME/.local/share/applications" \
	"$HOME/.local/share/fcitx5/rime"

ln -sfn "$h/.npmrc" "$HOME/.npmrc"
ln -sfnT "$h/.config/foot" "$HOME/.config/foot"
ln -sfnT "$h/.config/fd" "$HOME/.config/fd"
ln -sfnT "$h/.config/lf" "$HOME/.config/lf"
ln -sfnT "$h/.config/vis" "$HOME/.config/vis"
ln -sfnT "$h/.config/wl-kbptr" "$HOME/.config/wl-kbptr"
ln -sfnT "$h/.config/fontconfig" "$HOME/.config/fontconfig"
ln -sfnT "$h/.config/htop" "$HOME/.config/htop"
ln -sfnT "$h/.config/mpv" "$HOME/.config/mpv"
ln -sfnT "$h/.config/xdg-desktop-portal" "$HOME/.config/xdg-desktop-portal"
ln -sfnT "$h/.config/xdg-desktop-portal-termfilechooser" \
	"$HOME/.config/xdg-desktop-portal-termfilechooser"
ln -sfn "$h/.config/mimeapps.list" "$HOME/.config/mimeapps.list"
ln -sfn "$h/.config/nvim/init.lua" "$HOME/.config/nvim/init.lua"

ln -sfn "$h/.emacs.d/init.el" "$HOME/.emacs.d/init.el"
ln -sfn "$h/.emacs.d/early-init.el" "$HOME/.emacs.d/early-init.el"
ln -sfn "$h/.emacs.d/lisp" "$HOME/.emacs.d/lisp"

ln -sf "$h/.local/bin/"* "$HOME/.local/bin/"
ln -sfn "$h/.local/share/applications/helium.desktop" \
	"$HOME/.local/share/applications/helium.desktop"
ln -sfn "$h/.local/share/applications/lf.desktop" \
	"$HOME/.local/share/applications/lf.desktop"
ln -sfn "$h/.local/share/applications/vis.desktop" \
	"$HOME/.local/share/applications/vis.desktop"
ln -sf "$h/.local/share/fcitx5/rime/"* "$HOME/.local/share/fcitx5/rime/"

# 浏览器策略必须由 root 管理，不能链接到用户可写的仓库。
# recommended：可改的默认；managed：扩展强制安装/钉栏。
sudo install -d -o root -g root -m 755 \
	/etc/chromium/policies/managed \
	/etc/chromium/policies/recommended
sudo rm -f /etc/chromium/policies/recommended/extensions.json
sudo install -o root -g root -m 644 \
	"$dir/etc/chromium/policies/managed/extensions.json" \
	/etc/chromium/policies/managed/extensions.json
sudo install -o root -g root -m 644 \
	"$dir/etc/chromium/policies/recommended/helium.json" \
	/etc/chromium/policies/recommended/helium.json

# Helium 用户偏好种子（布局/主题/无系统标题栏按钮等）
chmod +x "$h/.local/bin/helium-seed-prefs" "$h/.local/bin/helium" 2>/dev/null || true
"$h/.local/bin/helium-seed-prefs" || true
