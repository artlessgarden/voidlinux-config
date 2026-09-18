#!/bin/sh
# 功能：完整 Niri 桌面及配套输入、音频、锁屏、截图
# 前提：先运行 01-system.sh 和对应硬件模块；Mouseless 下载需要访问 GitHub
# 生效：服务设置即时生效；用户组和桌面自启需重新登录，驱动需重启
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
h=$repo/root/home
mkdir -p "$HOME/.config" "$HOME/.local/bin"
sudo xbps-install -S \
    niri dbus seatd swaybg wlsunset brightnessctl xdg-utils gnome-themes-extra glib gsettings-desktop-schemas \
    alacritty font-inconsolata-otf wqy-microhei fuzzel \
    fcitx5 fcitx5-rime keyd \
    pipewire wireplumber alsa-pipewire bluez libspa-bluetooth \
    swayidle swaylock grim slurp swappy wl-clipboard \
    curl tar gzip

# --- 终端 ---
ln -sfnT "$h/.config/alacritty" "$HOME/.config/alacritty"

# --- 字体 ---
ln -sfnT "$h/.config/fontconfig" "$HOME/.config/fontconfig"
fc-cache -f

# --- 输入法 ---
mkdir -p "$HOME/.config/fcitx5/conf" "$HOME/.local/share/fcitx5/rime" "$HOME/.local/share/fcitx5/themes"
for name in profile config; do
    ln -sfn "$h/.config/fcitx5/$name" "$HOME/.config/fcitx5/$name"
done
ln -sfn "$h/.config/fcitx5/conf/classicui.conf" "$HOME/.config/fcitx5/conf/classicui.conf"
for source in "$h/.local/share/fcitx5/rime/"*; do
    ln -sfn "$source" "$HOME/.local/share/fcitx5/rime/"
done
ln -sfnT "$h/.local/share/fcitx5/themes/Nord-Dark" "$HOME/.local/share/fcitx5/themes/Nord-Dark"

# --- 键盘映射 ---
sudo install -d /etc/keyd
sudo install -m 644 "$repo/root/etc/keyd/"*.conf /etc/keyd/
sudo ln -sfn /etc/sv/keyd /var/service/keyd
if sudo sv status keyd 2>/dev/null | grep -q '^run:'; then
    sudo keyd reload
fi

# --- 音频 ---
mkdir -p "$HOME/.config/pipewire/pipewire.conf.d"
for source in /usr/share/examples/wireplumber/10-wireplumber.conf /usr/share/examples/pipewire/20-pipewire-pulse.conf; do
    test -f "$source"
    ln -sfn "$source" "$HOME/.config/pipewire/pipewire.conf.d/"
done

# --- 蓝牙 ---
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/bluetoothd /var/service/bluetoothd

# --- 闲置锁屏 ---

# --- 截图 ---

# --- 启动器 ---

# --- Mouseless ---
mouseless_tmp=$(mktemp -d /tmp/mouseless.XXXXXX)

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

sudo groupadd -f -r uinput
sudo usermod -aG input,uinput "$USER"
sudo install -o root -g root -m 644 -D \
	"$repo/root/etc/udev/rules.d/99-mouseless.rules" \
	/etc/udev/rules.d/99-mouseless.rules
sudo modprobe uinput
sudo udevadm control --reload-rules
sudo udevadm trigger --name-match=uinput

mkdir -p "$HOME/.config"
ln -sfnT "$repo/root/home/.config/mouseless" "$HOME/.config/mouseless"

printf '%s\n' \
	'Mouseless 已安装，将由 Niri 在登录后启动。' \
	'退出整个 Niri 会话再重新登录，使 input/uinput 用户组生效。'

# --- Niri 会话 ---
sudo ln -sfn /etc/sv/dbus /var/service/dbus
sudo ln -sfn /etc/sv/seatd /var/service/seatd
sudo usermod -aG _seatd "$USER"
ln -sfnT "$h/.config/niri" "$HOME/.config/niri"
niri validate --config "$h/.config/niri/config.kdl"
