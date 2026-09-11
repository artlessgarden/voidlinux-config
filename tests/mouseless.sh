#!/bin/sh
set -eu

repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
config=$repo/root/home/.config/mouseless/config.yaml
installer=$repo/75-mouseless.sh
niri=$repo/root/home/.config/niri/config.kdl
fail() {
	printf 'not ok - %s\n' "$1" >&2
	exit 1
}

[ -f "$config" ] || fail 'Mouseless config is missing'
[ -x "$installer" ] || fail 'Mouseless installer is missing or not executable'
[ ! -e "$repo/root/etc/sv/mouseless" ] || fail 'Mouseless still has a root runit service'
[ ! -e "$repo/root/etc/mouseless" ] || fail 'Mouseless config remains under /etc'

grep -Fq 'devices:' "$config" || fail 'Mouseless does not restrict input devices'
grep -Fq -- '- "keyd virtual keyboard"' "$config" ||
	fail 'Mouseless still captures physical keyboards'

for mapping in \
	'f13: move 0 -1' 'f14: move 0 1' 'f15: move -1 0' 'f16: move 1 0' \
	'f21: scroll up' 'f22: scroll down' 'f23: scroll left' 'f24: scroll right' \
	'f17: speed 0.1' 'f18: speed 0.3' 'f19: speed 2.0' 'f20: speed 4.0'; do
	grep -Fq "$mapping" "$config" || fail "missing mapping: $mapping"
done

grep -Fq 'https://api.github.com/repos/jbensmann/mouseless/releases/latest' "$installer" ||
	fail 'installer does not download official Mouseless'
grep -Fq 'usermod -aG input,uinput "$USER"' "$installer" ||
	fail 'installer does not grant user input permissions'
grep -Fq 'spawn-at-startup "mouseless"' "$niri" ||
	fail 'Niri does not start Mouseless after login'
if grep -Eq 'spawn-at-startup "mouseless".*--config' "$niri"; then
	fail 'Niri overrides the default user config path'
fi
grep -Eq '^for name in .* mouseless([ ;])' "$repo/70-link-apps.sh" ||
	fail 'user Mouseless config is not linked'
grep -Fxq 'sh 75-mouseless.sh' "$repo/flow.txt" || fail 'flow omits Mouseless'

# Exercise the real installer while replacing only network and privileged
# operations. The downloaded executable must land in the invoking user's home.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
mkdir -p "$tmp/bin" "$tmp/home"
cat >"$tmp/bin/curl" <<'EOF'
#!/bin/sh
case "$*" in
*api.github.com*) printf '%s\n' '{"tag_name": "v0.3.0"}' ;;
*) [ "$1" = -fL ] && [ "$3" = -o ] || exit 1
   cp "$MOUSELESS_TEST_ARCHIVE" "$4" ;;
esac
EOF
cat >"$tmp/bin/sudo" <<'EOF'
#!/bin/sh
exit 0
EOF
printf '#!/bin/sh\nexit 0\n' >"$tmp/mouseless"
chmod +x "$tmp/mouseless"
tar -czf "$tmp/mouseless.tar.gz" -C "$tmp" mouseless
chmod +x "$tmp/bin/curl" "$tmp/bin/sudo"
MOUSELESS_TEST_ARCHIVE="$tmp/mouseless.tar.gz" HOME="$tmp/home" USER=test PATH="$tmp/bin:$PATH" sh "$installer" >/dev/null
[ -x "$tmp/home/.local/bin/mouseless" ] ||
	fail 'installer does not place Mouseless in the user bin directory'

printf 'ok - Niri starts user Mouseless after keyd\n'
