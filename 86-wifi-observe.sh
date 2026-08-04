#!/bin/sh
# Wi-Fi observation helpers (not a "fix" — for evidence before changing behavior)
# Requires: already ran 40-sv-base (which downs all service logs)
dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

sudo xbps-install -S socklog-void
sudo ln -sfn /etc/sv/socklog-unix /var/service/socklog-unix
sudo ln -sfn /etc/sv/nanoklogd /var/service/nanoklogd
sudo usermod -aG socklog "$USER"

# Timestamps on wpa_supplicant stdout → socklog daemon facility
sudo tee /etc/sv/wpa_supplicant/conf >/dev/null <<'EOF'
# -t: timestamps; keep -M match-ifaces from Void default
OPTS="-t -M -c /etc/wpa_supplicant/wpa_supplicant.conf"
EOF

wpa=$(readlink -f /var/service/wpa_supplicant)
if [ -d "$wpa/log" ]; then
	sudo rm -f "$wpa/log/down"
	sudo sv up "$wpa/log" 2>/dev/null || true
fi
sudo sv restart wpa_supplicant

echo "重新登录后可读 /var/log/socklog/{daemon,kernel}/current"
echo "空闲快照: ~/.local/state/wifi-watch/；手动: wifi-snap now"
