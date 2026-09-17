#!/bin/sh
# MSI Intel graphics, microcode and Meteor Lake audio firmware.
# 功能：设备专属显卡／微码／固件
# 生效：驱动及固件下次重启
set -eu
sudo xbps-install -S intel-ucode mesa-intel-dri intel-video-accel sof-firmware
printf '%s\n' 'MSI 硬件包已安装；微码、驱动和固件在下次重启后完整生效。'
