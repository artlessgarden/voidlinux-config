#!/bin/sh
# River + tri session: peripherals aligned with niri, then exec tri.
set -eu

export XCURSOR_THEME="${XCURSOR_THEME:-Adwaita}"
export XCURSOR_SIZE="${XCURSOR_SIZE:-28}"
unset GTK_IM_MODULE || true
export QT_IM_MODULE="${QT_IM_MODULE:-fcitx}"
export QT_IM_MODULES="${QT_IM_MODULES:-wayland;fcitx}"
export XMODIFIERS="${XMODIFIERS:-@im=fcitx}"
export XDG_CURRENT_DESKTOP="${XDG_CURRENT_DESKTOP:-river}"
export XDG_SESSION_DESKTOP="${XDG_SESSION_DESKTOP:-river}"
export XDG_SESSION_TYPE="${XDG_SESSION_TYPE:-wayland}"

dbus-update-activation-environment --systemd \
	DISPLAY WAYLAND_DISPLAY XDG_CURRENT_DESKTOP XDG_SESSION_TYPE \
	XDG_SESSION_DESKTOP XCURSOR_THEME XCURSOR_SIZE \
	QT_IM_MODULE QT_IM_MODULES XMODIFIERS 2>/dev/null ||
	dbus-update-activation-environment \
		DISPLAY WAYLAND_DISPLAY XDG_CURRENT_DESKTOP XDG_SESSION_TYPE \
		XDG_SESSION_DESKTOP XCURSOR_THEME XCURSOR_SIZE \
		QT_IM_MODULE QT_IM_MODULES XMODIFIERS 2>/dev/null || true
systemctl --user unset-environment GTK_IM_MODULE 2>/dev/null || true

portal_libexec=/usr/libexec
for pid in $(pgrep -f "$portal_libexec/xdg-desktop-portal" 2>/dev/null || true); do
	kill "$pid" 2>/dev/null || true
done
sleep 0.2
[ -x "$portal_libexec/xdg-desktop-portal-termfilechooser" ] &&
	"$portal_libexec/xdg-desktop-portal-termfilechooser" >/dev/null 2>&1 &
sleep 0.2
[ -x "$portal_libexec/xdg-desktop-portal" ] &&
	"$portal_libexec/xdg-desktop-portal" >/dev/null 2>&1 &

tri_script=$(readlink -f "$0" 2>/dev/null) || tri_script=$0
tri_dir=$(CDPATH= cd -- "$(dirname "$tri_script")" && pwd)
tri_config="${TRI_CONFIG:-$tri_dir/config}"
export TRI_CONFIG="$tri_config"

OUTPUT=eDP-1
MODE=2560x1600@60Hz
SCALE=1.5
if [ -f "$tri_config" ]; then
	while IFS= read -r line || [ -n "$line" ]; do
		case "$line" in
		''|\#*) continue ;;
		esac
		key=${line%%=*}
		val=${line#*=}
		key=$(printf '%s' "$key" | tr -d ' \t')
		val=$(printf '%s' "$val" | sed 's/^[ \t]*//')
		case "$key" in
		output) OUTPUT=$val ;;
		mode) MODE=$val ;;
		scale) SCALE=$val ;;
		cursor_theme) export XCURSOR_THEME=$val ;;
		cursor_size) export XCURSOR_SIZE=$val ;;
		esac
	done <"$tri_config"
fi

i=0
while [ "$i" -lt 50 ]; do
	i=$((i + 1))
	if wlr-randr --output "$OUTPUT" --mode "$MODE" --scale "$SCALE" >/dev/null 2>&1; then
		break
	fi
	sleep 0.1
done

fcitx5 >/dev/null 2>&1 &
pipewire >/dev/null 2>&1 &
wlsunset -l 20 -L 100 >/dev/null 2>&1 &
mouseless >/dev/null 2>&1 &
alacritty >/dev/null 2>&1 &

if command -v swayidle >/dev/null 2>&1; then
	swayidle -w \
		timeout 180 "swaylock -f -i /home/xiang/.config/niri/bg3.jpg" \
		timeout 240 "wlopm --off '*'" \
		resume "wlopm --on '*'" \
		>/dev/null 2>&1 &
fi

tri_bin="$tri_dir/zig-out/bin/tri"
if [ ! -x "$tri_bin" ]; then
	echo "tri: build first: cd $tri_dir && ./rebuild.sh" >&2
	exit 1
fi
exec "$tri_bin"
