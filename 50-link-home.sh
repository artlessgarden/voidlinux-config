#!/bin/sh
# 链 home：shell、niri、输入法（最小可 ni）
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
h=$dir/home

mkdir -p "$HOME/.config/fcitx5"

ln -sfn "$h/.asoundrc" "$HOME/.asoundrc"
ln -sfn "$h/.bash_profile" "$HOME/.bash_profile"
ln -sfn "$h/.bashrc" "$HOME/.bashrc"
ln -sfn "$h/.inputrc" "$HOME/.inputrc"

ln -sfnT "$h/.config/niri" "$HOME/.config/niri"
ln -sfn "$h/.config/fcitx5/profile" "$HOME/.config/fcitx5/profile"
