#!/bin/sh
# 功能：Fuzzel 应用启动器
# 生效：立即可用
# 前提：niri.sh 提供 Mod+Space；terminal.sh 提供终端
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S fuzzel
