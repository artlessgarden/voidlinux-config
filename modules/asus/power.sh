#!/bin/sh
# 功能：ASUS 80% 电池上限及 quiet，开机恢复
# 生效：立即及每次开机
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
sudo install -m 755 "$repo/root/etc/rc.local" /etc/rc.local
sudo /etc/rc.local
