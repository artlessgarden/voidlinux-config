#!/bin/sh
# ni 之后：日常应用包（无 fuzzel / mako）
# 截图注解用 satty（gtk4）。
# Helium（非 xbps）需要 nss + nspr
# nvim 备用编辑器：tree-sitter-cli + gcc 用来编 parser
sudo xbps-install -S \
	imv mpv zathura-pdf-poppler \
	grim slurp satty wl-kbptr \
	xdg-desktop-portal-termfilechooser xdg-utils lf bat chafa ripgrep \
	curl fd fzf htop vis neovim \
	tree-sitter-cli gcc make \
	nss nspr
