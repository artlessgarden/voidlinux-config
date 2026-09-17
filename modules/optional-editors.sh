#!/bin/sh
# 功能：只链接 Emacs、Neovim 配置，不安装应用
# 生效：下次打开编辑器
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
ln -sfnT "$h/.config/emacs" "$HOME/.config/emacs"
ln -sfnT "$h/.config/nvim" "$HOME/.config/nvim"
