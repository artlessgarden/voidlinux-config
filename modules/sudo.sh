#!/bin/sh
# 功能：当前用户免密码 sudo
# 生效：立即；请以普通用户运行
set -eu

user=${USER:?USER is not set}
case "$user" in
	*[!abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-]*)
		printf 'Unsupported user name: %s\n' "$user" >&2
		exit 1
		;;
esac

sudoers_dir=${SUDOERS_DIR:-/etc/sudoers.d}
rule=$sudoers_dir/zz-$user-nopasswd
tmp=$(mktemp /tmp/sudo-rule.XXXXXX)

printf '%s ALL=(ALL:ALL) NOPASSWD: ALL\n' "$user" >"$tmp"
chmod 440 "$tmp"
sudo visudo -cf "$tmp"
sudo install -o root -g root -m 440 "$tmp" "$rule"
printf '%s\n' "Passwordless sudo enabled for $user."
