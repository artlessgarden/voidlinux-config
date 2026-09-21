#!/bin/sh
# 功能：ASUS 显卡、独显开关、电源与 Wi-Fi 特殊设置
# 前提：仅 ASUS 本机；已运行 01-system.sh；不修改 GRUB
# 生效：服务设置即时生效；用户组和桌面自启需重新登录，驱动需重启
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

# --- 图形 ---
sudo xbps-install -Sy -y mesa-dri mesa-vaapi
printf '%s\n' 'ASUS 图形包已安装；重新打开图形程序后使用新组件。'

# --- 独显 ---
# Prefer the current firmware-attributes API and retain the kernel's compatible
# ASUS WMI path for machines that do not expose asus-armoury yet.
dgpu_control=/sys/class/firmware-attributes/asus-armoury/attributes/dgpu_disable/current_value
if [ ! -e "$dgpu_control" ]; then
	dgpu_control=/sys/devices/platform/asus-nb-wmi/dgpu_disable
fi
if [ ! -e "$dgpu_control" ]; then
	printf '%s\n' '找不到 ASUS 独显开关；未更改显卡状态。' >&2
	exit 1
fi
printf '1\n' | sudo tee "$dgpu_control" >/dev/null
if [ "$(sudo cat "$dgpu_control")" != 1 ]; then
	printf '%s\n' 'ASUS 固件没有确认关闭独显。' >&2
	exit 1
fi

# --- 电源 ---
sudo install -m 755 "$repo/root/etc/rc.local" /etc/rc.local
sudo /etc/rc.local

# --- Wi-Fi 特殊设置 ---
sudo install -m 644 -D "$repo/root/etc/modprobe.d/iwlwifi.conf" /etc/modprobe.d/iwlwifi.conf
sudo install -m 755 -D "$repo/root/etc/zzz.d/resume/10-wifi" /etc/zzz.d/resume/10-wifi
sudo install -m 755 -D "$repo/root/etc/wpa_supplicant/action-reconnect.sh" /etc/wpa_supplicant/action-reconnect.sh
sudo install -m 755 -D "$repo/root/etc/rc.local.d/asus-wifi" /etc/rc.local.d/asus-wifi
sudo /etc/rc.local.d/asus-wifi
