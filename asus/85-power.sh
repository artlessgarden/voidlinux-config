#!/bin/sh
# ASUS：电池 80% + quiet；iwlwifi 关省电；唤醒/掉线自动重连
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

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

sudo install -o root -g root -m 755 "$repo/root/etc/rc.local" /etc/rc.local
sudo install -o root -g root -m 644 \
	"$repo/root/etc/modprobe.d/iwlwifi.conf" /etc/modprobe.d/iwlwifi.conf
sudo install -o root -g root -m 755 -D \
	"$repo/root/etc/zzz.d/resume/10-wifi" /etc/zzz.d/resume/10-wifi
sudo install -o root -g root -m 755 -D \
	"$repo/root/etc/wpa_supplicant/action-reconnect.sh" \
	/etc/wpa_supplicant/action-reconnect.sh
sudo /etc/rc.local
printf '%s\n' \
	'独显已关闭；电池限制和重连脚本已立即应用。' \
	'iwlwifi 模块参数在下次重启后生效。'
