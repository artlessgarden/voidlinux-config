#!/bin/sh

sudo sed -i \
    -e 's|^GRUB_DEFAULT=.*|GRUB_DEFAULT=0|' \
    -e 's|^GRUB_TIMEOUT=.*|GRUB_TIMEOUT=0|' \
    -e 's|^GRUB_CMDLINE_LINUX_DEFAULT=.*|GRUB_CMDLINE_LINUX_DEFAULT="loglevel=4 gpiolib_acpi.run_edge_events_on_boot=0"|' \
    /etc/default/grub

sudo rm -f /etc/grub.d/09_windows

sudo update-grub

# 默认直接进入 Windows；按 Esc 在 ASUS 菜单中选择 void_grub 后立即进 Void。
# 旧 Arch 启动项保留，但不再加入默认启动顺序。
sudo efibootmgr -o 0000,0001
