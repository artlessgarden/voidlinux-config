#!/bin/sh

sudo sed -i \
    's|^GRUB_CMDLINE_LINUX_DEFAULT=.*|GRUB_CMDLINE_LINUX_DEFAULT="loglevel=4 gpiolib_acpi.run_edge_events_on_boot=0"|' \
    /etc/default/grub

sudo update-grub

# Windows 默认启动；按 Esc 在 UEFI 菜单中选择 void_grub。
# 0000: Windows，0001: Void，0002: 旧 Arch。
sudo efibootmgr -o 0000,0001,0002
