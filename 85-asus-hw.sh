#!/bin/sh
# ASUS 电池上限 80% + platform quiet（sysfs，每次开机由 rc.local 恢复）
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

sudo install -o root -g root -m 755 "$dir/etc/rc.local" /etc/rc.local
sudo /etc/rc.local
