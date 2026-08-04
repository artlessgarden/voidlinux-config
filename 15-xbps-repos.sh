#!/bin/sh
# Fastly 镜像 + nonfree（覆盖 /usr/share 同名默认源）
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

sudo mkdir -p /etc/xbps.d
sudo install -o root -g root -m 644 \
	"$dir/etc/xbps.d/00-repository-main.conf" \
	/etc/xbps.d/00-repository-main.conf
sudo install -o root -g root -m 644 \
	"$dir/etc/xbps.d/10-repository-nonfree.conf" \
	/etc/xbps.d/10-repository-nonfree.conf

sudo xbps-install -S
xbps-query -L
