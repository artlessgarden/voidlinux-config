#!/bin/sh

repo="$HOME/voidlinux-config"

# 第一次运行在这里输入最后一次 sudo 密码。
sudo install -o root -g root -m 440 \
    "$repo/system/etc/sudoers.d/xiang-nopasswd" \
    /etc/sudoers.d/xiang-nopasswd

sh "$repo/links.sh"
sh "$repo/packages.sh"
sh "$repo/services.sh"
sh "$repo/hardware.sh"
