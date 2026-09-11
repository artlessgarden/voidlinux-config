#!/bin/sh
# Install the official Mouseless binary and grant the logged-in user access to input and uinput.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
mouseless_tmp=$(mktemp -d)
trap 'rm -rf "$mouseless_tmp"' EXIT HUP INT TERM

sudo xbps-install -y curl tar gzip
[ "$(uname -m)" = x86_64 ] || {
	printf '%s\n' 'Mouseless 官方目前只提供 Linux x86_64 二进制。' >&2
	exit 1
}
latest=$(curl -fsSL https://api.github.com/repos/jbensmann/mouseless/releases/latest |
	sed -n 's/.*"tag_name": "\([^"]*\)".*/\1/p' | head -n 1)
case $latest in
v[0-9]*) ;;
*)
	printf '%s\n' '无法获取 Mouseless 最新稳定版。' >&2
	exit 1
	;;
esac
curl -fL "https://github.com/jbensmann/mouseless/releases/download/$latest/mouseless_linux_amd64.tar.gz" \
	-o "$mouseless_tmp/mouseless.tar.gz"
tar -xzf "$mouseless_tmp/mouseless.tar.gz" -C "$mouseless_tmp" mouseless
"$mouseless_tmp/mouseless" --version

mkdir -p "$HOME/.local/bin"
install -m 755 "$mouseless_tmp/mouseless" "$HOME/.local/bin/mouseless.new"
mv -f "$HOME/.local/bin/mouseless.new" "$HOME/.local/bin/mouseless"

# Remove the former system-wide binary when upgrading this configuration.
sudo rm -f /usr/local/bin/mouseless
sudo groupadd -f -r uinput
sudo usermod -aG input,uinput "$USER"
sudo install -o root -g root -m 644 -D \
	"$repo/root/etc/udev/rules.d/99-mouseless.rules" \
	/etc/udev/rules.d/99-mouseless.rules
sudo modprobe uinput
sudo udevadm control --reload-rules
sudo udevadm trigger --name-match=uinput

# Remove the former root runit service when upgrading this configuration.
sudo sv down /var/service/mouseless 2>/dev/null || true
sudo rm -f /var/service/mouseless /etc/sv/mouseless/run /etc/mouseless/config.yaml
sudo rmdir /etc/sv/mouseless /etc/mouseless 2>/dev/null || true

printf '%s\n' \
	'Mouseless 已安装，将由 Niri 在登录后启动。' \
	'退出整个 Niri 会话再重新登录，使 input/uinput 用户组生效。'
