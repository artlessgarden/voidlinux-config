#!/bin/sh
# mouseless：用户进程，读 keyd 虚拟键盘 → uinput 鼠标。
# 二进制只放 ~/.local/bin；权限靠 uinput/input 组，不要 sudo。
set -e
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ver=${MOUSELESS_VER:-v0.3.0}
url="https://github.com/jbensmann/mouseless/releases/download/${ver}/mouseless_linux_amd64.tar.gz"

mkdir -p "$HOME/.local/bin"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" | tar -xzf - -C "$tmp"
install -m 755 "$tmp/mouseless" "$HOME/.local/bin/mouseless"
# 以前为了 sudo 另装过一份，清掉
sudo rm -f /usr/local/bin/mouseless

sudo groupadd --system uinput 2>/dev/null || true
sudo usermod -aG input,uinput "$USER"
sudo install -o root -g root -m 644 \
	"$dir/etc/udev/rules.d/99-mouseless.rules" \
	/etc/udev/rules.d/99-mouseless.rules
echo uinput | sudo tee /etc/modules-load.d/uinput.conf >/dev/null
sudo modprobe uinput 2>/dev/null || true
sudo udevadm control --reload-rules 2>/dev/null || true
sudo udevadm trigger --name-match=uinput 2>/dev/null || true

echo "mouseless -> ~/.local/bin/mouseless ($ver)"
echo "配置默认 ~/.config/mouseless/config.yaml（niri 里 spawn mouseless 即可）"
echo "input+uinput 要重新登录（退 niri → 登出 tty → 再 ni）才进当前会话"
