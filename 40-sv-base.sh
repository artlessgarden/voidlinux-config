#!/bin/sh
#
# 底座服务（开箱后跑一次即可）
#
# 1) dbus：会话总线，niri / fcitx 等需要
# 2) seatd：让普通用户能用显卡和输入设备（再把用户加进 _seatd 组）
# 3) alsa / chronyd：本机需要音量与校时
# 4) 只留 tty1、tty2：装机默认会启 tty1–6
# 5) 关掉各服务的 log 子服务：默认无 syslog 时 vlogger 空转。
#    若稍后跑 86-wifi-observe.sh（socklog），会单独打开 wpa_supplicant 的 log。
#

# --- 必要服务 ---
sudo ln -sfn /etc/sv/alsa /var/service/alsa
sudo ln -sfn /etc/sv/chronyd /var/service/chronyd
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/seatd /var/service/seatd
sudo usermod -aG _seatd "$USER"

# --- 多余 getty ---
sudo rm -f \
	/var/service/agetty-tty3 \
	/var/service/agetty-tty4 \
	/var/service/agetty-tty5 \
	/var/service/agetty-tty6

# --- 关掉 vlogger（各服务 /log）---
for service in /var/service/*; do
	[ -d "$service/log" ] || continue
	target=$(readlink -f "$service")
	sudo touch "$target/log/down"
	sudo sv down "$service/log" 2>/dev/null || true
done
