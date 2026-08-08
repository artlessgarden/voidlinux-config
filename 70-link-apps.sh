#!/bin/sh
# ni 之后：应用配置与入口
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
ln -sfnT "$h/.config/mouseless" "$HOME/.config/mouseless"
ln -sfnT "$h/.config/qutebrowser" "$HOME/.config/qutebrowser"
# jseval -f 只认 data/js；链到 config 里同一份，仓库只维护 config
mkdir -p "$HOME/.local/share/qutebrowser"
ln -sfnT "$HOME/.config/qutebrowser/js" "$HOME/.local/share/qutebrowser/js"
# 旧版曾链到 share/userscripts，清掉以免抢在 config 前面
rm -rf "$HOME/.local/share/qutebrowser/userscripts"
chmod +x "$h/.config/qutebrowser/userscripts/"* 2>/dev/null || true
ln -sfnT "$h/.config/xdg-desktop-portal" "$HOME/.config/xdg-desktop-portal"
ln -sfnT "$h/.config/xdg-desktop-portal-termfilechooser" \
	"$HOME/.config/xdg-desktop-portal-termfilechooser"
ln -sfn "$h/.config/mimeapps.list" "$HOME/.config/mimeapps.list"
ln -sfn "$h/.config/nvim/init.lua" "$HOME/.config/nvim/init.lua"

ln -sfn "$h/.emacs.d/init.el" "$HOME/.emacs.d/init.el"
ln -sfn "$h/.emacs.d/early-init.el" "$HOME/.emacs.d/early-init.el"
ln -sfn "$h/.emacs.d/lisp" "$HOME/.emacs.d/lisp"

chmod +x "$h/.local/bin/"* 2>/dev/null || true
ln -sf "$h/.local/bin/"* "$HOME/.local/bin/"
# 卸掉旧 Helium 桌面入口（若曾链过）
rm -f "$HOME/.local/share/applications/helium.desktop"
ln -sfn "$h/.local/share/applications/lf.desktop" \
	"$HOME/.local/share/applications/lf.desktop"
ln -sfn "$h/.local/share/applications/vis.desktop" \
	"$HOME/.local/share/applications/vis.desktop"
ln -sf "$h/.local/share/fcitx5/rime/"* "$HOME/.local/share/fcitx5/rime/"
