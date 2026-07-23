#!/bin/sh

sudo xbps-install -S \
    mesa-dri \
    niri alacritty dbus seatd \
    swaybg swayidle swaylock wlsunset wl-clipboard brightnessctl \
    fcitx5 fcitx5-rime \
    alsa-utils chrony keyd \
    xdg-desktop-portal-termfilechooser lf \
    bash-completion curl fd fzf git htop fastfetch vis xz \
    font-inconsolata-otf wqy-microhei \
    at-spi2-atk at-spi2-core atk libXcomposite libXdamage libcups nss
