#!/bin/sh
# 功能：MSI 显卡、固件及电源
# 前提：仅 MSI 本机；已运行 01-system.sh 启用 nonfree；不修改 GRUB
# 生效：服务设置即时生效；用户组和桌面自启需重新登录，驱动需重启
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

# --- 图形和固件 ---
sudo xbps-install -S intel-ucode mesa-dri intel-video-accel sof-firmware
printf '%s\n' 'MSI 硬件包已安装；微码、驱动和固件在下次重启后完整生效。'

# --- 电源 ---
sudo xbps-install -S tlp
sudo install -d /etc/tlp.d
sudo install -m 644 "$repo/root/etc/tlp.d/10-laptop.conf" /etc/tlp.d/10-laptop.conf
sudo ln -sfn /etc/sv/tlp /var/service/tlp
printf '%s\n' 'TLP 配置已安装、服务已启用，立即生效。'
