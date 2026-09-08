#!/bin/sh
# Machine-local opt-in; this marker is not part of the shared dotfiles.
set -eu
config=${XDG_CONFIG_HOME:-$HOME/.config}/telegram-memo
mkdir -p "$config"
touch "$config/enabled"
printf '%s\n' 'MSI Telegram 备注已启用；重新打开 vis 生效，Niri 下次登录自动启动。'
