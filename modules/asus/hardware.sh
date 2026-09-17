#!/bin/sh
# ASUS AMD graphics stack.
# 功能：设备专属显卡／微码／固件
# 生效：驱动及固件下次重启
set -eu
sudo xbps-install -S mesa-dri mesa-vaapi
printf '%s\n' 'ASUS 图形包已安装；重新打开图形程序后使用新组件。'
