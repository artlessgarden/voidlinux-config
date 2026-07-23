#!/bin/sh

sudo ln -sfn /etc/sv/alsa /var/service/alsa
sudo ln -sfn /etc/sv/chronyd /var/service/chronyd
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/keyd /var/service/keyd
sudo ln -sfn /etc/sv/seatd /var/service/seatd

sudo unlink /var/service/agetty-tty3
sudo unlink /var/service/agetty-tty4
sudo unlink /var/service/agetty-tty5
sudo unlink /var/service/agetty-tty6

sudo usermod -aG _seatd "$USER"

