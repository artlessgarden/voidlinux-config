#!/bin/sh
# 功能：通过 ASUS 固件关闭独显
# 生效：立即；不存在对应接口则退出
set -eu
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
