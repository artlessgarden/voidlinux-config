#!/bin/sh

sudo ln -sfn /etc/sv/alsa /var/service/alsa
sudo ln -sfn /etc/sv/chronyd /var/service/chronyd
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/keyd /var/service/keyd
sudo ln -sfn /etc/sv/seatd /var/service/seatd

# 本机不运行 syslog 接收器，vlogger 不会留下可读的历史日志。
# 关闭各服务的日志子服务，但保留 Void 包提供的 log/run，方便以后恢复。
for service in /var/service/*; do
    [ -d "$service/log" ] || continue
    target=$(readlink -f "$service")
    sudo touch "$target/log/down"
    sudo sv down "$service/log"
done

sudo unlink /var/service/agetty-tty3
sudo unlink /var/service/agetty-tty4
sudo unlink /var/service/agetty-tty5
sudo unlink /var/service/agetty-tty6

sudo usermod -aG _seatd "$USER"
