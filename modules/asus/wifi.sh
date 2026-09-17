#!/bin/sh
# 功能：ASUS iwlwifi 参数、唤醒及掉线重连
# 前提：modules/wifi.sh；power.sh 安装 rc.local 开机入口；本机接口 wlp99s0
# 生效：脚本立即；内核模块参数下次重启
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
sudo install -m 644 -D "$repo/root/etc/modprobe.d/iwlwifi.conf" /etc/modprobe.d/iwlwifi.conf
sudo install -m 755 -D "$repo/root/etc/zzz.d/resume/10-wifi" /etc/zzz.d/resume/10-wifi
sudo install -m 755 -D "$repo/root/etc/wpa_supplicant/action-reconnect.sh" /etc/wpa_supplicant/action-reconnect.sh
sudo install -m 755 -D "$repo/root/etc/rc.local.d/asus-wifi" /etc/rc.local.d/asus-wifi
sudo /etc/rc.local.d/asus-wifi
