#!/bin/sh
# 功能：补齐 void-installer 未写入的本机 hosts
# 前提：已在 /etc/hostname 设置本机名称；仅首次装机按需运行
# 生效：立即
set -eu
hostname=$(cat /etc/hostname)
printf '127.0.0.1\tlocalhost.localdomain\tlocalhost\n127.0.1.1\t%s.localdomain\t%s\n::1\tlocalhost.localdomain\tlocalhost ip6-localhost\n' "$hostname" "$hostname" | sudo tee /etc/hosts >/dev/null
