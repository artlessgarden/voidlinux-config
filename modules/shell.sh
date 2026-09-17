#!/bin/sh
# 功能：Shell、历史、补全、查包及更新命令
# 生效：新终端
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S bash-completion git openssh fd fzf ripgrep htop fastfetch
for name in .bash_profile .bashrc .inputrc .npmrc; do
    ln -sfn "$h/$name" "$HOME/$name"
done
ln -sfnT "$h/.config/fd" "$HOME/.config/fd"
ln -sfnT "$h/.config/htop" "$HOME/.config/htop"
for name in xba xbg xbk xbo xbr xbs; do
    ln -sfn "$h/.local/bin/$name" "$HOME/.local/bin/$name"
done
