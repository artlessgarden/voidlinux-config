#!/bin/sh
# 功能：wpa_supplicant 和 DHCP
# 生效：服务启用后；不覆盖网络凭据或重启现有连接
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S wpa_supplicant dhcpcd iw
if ! sudo test -s /etc/wpa_supplicant/wpa_supplicant.conf; then
    printf '%s\n' '请先按 README 填写本机 /etc/wpa_supplicant/wpa_supplicant.conf，然后重跑本模块。' >&2
    exit 1
fi
sudo ln -sfn /etc/sv/wpa_supplicant /var/service/wpa_supplicant
sudo ln -sfn /etc/sv/dhcpcd /var/service/dhcpcd
