#!/bin/sh

sudo sed -i \
    -e 's|^GRUB_DEFAULT=.*|GRUB_DEFAULT=0|' \
    -e 's|^GRUB_TIMEOUT=.*|GRUB_TIMEOUT=2|' \
    -e 's|^GRUB_CMDLINE_LINUX_DEFAULT=.*|GRUB_CMDLINE_LINUX_DEFAULT="loglevel=4 gpiolib_acpi.run_edge_events_on_boot=0"|' \
    /etc/default/grub

sudo install -o root -g root -m 755 \
    "$HOME/voidlinux-config/system/etc/grub.d/09_windows" \
    /etc/grub.d/09_windows

sudo update-grub

# UEFI 默认进入 Void GRUB；GRUB 第一项 Windows，第二项 Void。
# 旧 Arch 启动项保留，但不再加入默认启动顺序。
sudo efibootmgr -o 0001,0000
