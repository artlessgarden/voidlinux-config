#!/bin/sh
# mouseless（keyd F13+ 控鼠标）。Void 无包，装官方 amd64 二进制。
set -e
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
h=$dir/home
ver=${MOUSELESS_VER:-v0.3.0}
url="https://github.com/jbensmann/mouseless/releases/download/${ver}/mouseless_linux_amd64.tar.gz"

mkdir -p "$HOME/.local/bin"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" | tar -xzf - -C "$tmp"
install -m 755 "$tmp/mouseless" "$HOME/.local/bin/mouseless"
sudo install -m 755 "$tmp/mouseless" /usr/local/bin/mouseless
rm -rf "$HOME/.config/mouseless"
ln -sfnT "$h/.config/mouseless" "$HOME/.config/mouseless"

sudo groupadd --system uinput 2>/dev/null || true
sudo usermod -aG input,uinput "$USER"
sudo install -o root -g root -m 644 \
	"$dir/etc/udev/rules.d/99-mouseless.rules" \
	/etc/udev/rules.d/99-mouseless.rules
echo uinput | sudo tee /etc/modules-load.d/uinput.conf >/dev/null
sudo modprobe uinput 2>/dev/null || true
sudo udevadm control --reload-rules 2>/dev/null || true
sudo udevadm trigger 2>/dev/null || true

echo "mouseless -> /usr/local/bin/mouseless ($ver)"
echo "组 input+uinput 要重新登录才不用 sudo；当前: sudo -n mouseless --config ~/.config/mouseless/config.yaml"
