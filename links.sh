#!/bin/sh

repo="$HOME/voidlinux-config"

mkdir -p \
    "$HOME/.config" \
    "$HOME/.config/nvim" \
    "$HOME/.config/fcitx5" \
    "$HOME/.config/mako" \
    "$HOME/.emacs.d" \
    "$HOME/.local/bin" \
    "$HOME/.local/share/applications" \
    "$HOME/.local/share/fcitx5/rime"

ln -sfn "$repo/home/.asoundrc" "$HOME/.asoundrc"
ln -sfn "$repo/home/.bash_profile" "$HOME/.bash_profile"
ln -sfn "$repo/home/.bashrc" "$HOME/.bashrc"
ln -sfn "$repo/home/.inputrc" "$HOME/.inputrc"
ln -sfn "$repo/home/.npmrc" "$HOME/.npmrc"

ln -sfn "$repo/home/.config/fontconfig" "$HOME/.config/fontconfig"
ln -sfn "$repo/home/.config/htop" "$HOME/.config/htop"
ln -sfn "$repo/home/.config/vis" "$HOME/.config/vis"
ln -sfn "$repo/home/.config/wl-kbptr" "$HOME/.config/wl-kbptr"
ln -sfn "$repo/home/.config/xdg-desktop-portal" "$HOME/.config/xdg-desktop-portal"
ln -sfn "$repo/home/.config/xdg-desktop-portal-termfilechooser" "$HOME/.config/xdg-desktop-portal-termfilechooser"

ln -sfnT "$repo/home/.config/niri" "$HOME/.config/niri"
ln -sfn "$repo/home/.config/nvim/init.lua" "$HOME/.config/nvim/init.lua"
ln -sfn "$repo/home/.config/fcitx5/profile" "$HOME/.config/fcitx5/profile"
ln -sfn "$repo/home/.config/mimeapps.list" "$HOME/.config/mimeapps.list"
ln -sfn "$repo/home/.config/mako/config" "$HOME/.config/mako/config"

ln -sfn "$repo/home/.emacs.d/init.el" "$HOME/.emacs.d/init.el"
ln -sfn "$repo/home/.emacs.d/early-init.el" "$HOME/.emacs.d/early-init.el"
ln -sfn "$repo/home/.emacs.d/lisp" "$HOME/.emacs.d/lisp"

ln -sf "$repo/home/.local/bin/"* "$HOME/.local/bin/"
ln -sfn "$repo/home/.local/share/applications/helium.desktop" "$HOME/.local/share/applications/helium.desktop"
ln -sfn "$repo/home/.local/share/applications/lf.desktop" "$HOME/.local/share/applications/lf.desktop"
ln -sfn "$repo/home/.local/share/applications/vis.desktop" "$HOME/.local/share/applications/vis.desktop"
ln -sf "$repo/home/.local/share/fcitx5/rime/"* "$HOME/.local/share/fcitx5/rime/"

sudo mkdir -p /etc/keyd
sudo ln -sf "$repo/system/etc/keyd/"*.conf /etc/keyd/
