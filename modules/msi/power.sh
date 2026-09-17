#!/bin/sh
# 功能：MSI 安静电源配置及 TLP 服务
# 生效：服务启用后
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)

sudo xbps-install -S tlp
sudo install -d /etc/tlp.d
sudo install -m 644 "$repo/root/etc/tlp.d/10-laptop.conf" /etc/tlp.d/10-laptop.conf
sudo ln -sfn /etc/sv/tlp /var/service/tlp
printf '%s\n' 'TLP 配置已安装、服务已启用，立即生效。'
