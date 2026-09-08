#!/bin/sh
set -eu

repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
fail() { printf 'not ok - %s\n' "$1" >&2; exit 1; }

mkdir -p "$tmp/bin" "$tmp/etc/sudoers.d"
printf '%s\n' '%wheel ALL=(ALL:ALL) ALL' >"$tmp/etc/sudoers.d/wheel"
printf '%s\n' 'tester ALL=(ALL:ALL) NOPASSWD: ALL' >"$tmp/etc/sudoers.d/10-tester-nopasswd"
cat >"$tmp/bin/sudo" <<'EOF'
#!/bin/sh
set -eu
case "$1" in
	install)
		src=${8}
		dst=${9}
		cp "$src" "$dst"
		chmod 440 "$dst"
		;;
	visudo)
		test "$2" = -cf
		test -f "$3"
		;;
	rm)
		test "$2" = -f
		rm -f "$3"
		;;
	*) exit 1 ;;
esac
EOF
chmod +x "$tmp/bin/sudo"

PATH="$tmp/bin:$PATH" SUDOERS_DIR="$tmp/etc/sudoers.d" USER=tester \
	sh "$repo/16-sudo.sh"

rule=$tmp/etc/sudoers.d/zz-tester-nopasswd
[ -f "$rule" ] || fail 'passwordless sudo rule was not installed'
[ ! -e "$tmp/etc/sudoers.d/10-tester-nopasswd" ] || fail 'old early-loading sudo rule was not removed'
[ "$(stat -c %a "$rule")" = 440 ] || fail 'sudoers rule mode is not 0440'
[ "$(cat "$rule")" = 'tester ALL=(ALL:ALL) NOPASSWD: ALL' ] || \
	fail 'sudoers rule does not grant the configured user passwordless sudo'
[ "$(find "$tmp/etc/sudoers.d" -maxdepth 1 -type f -printf '%f\n' | sort | tail -n 1)" = \
	'zz-tester-nopasswd' ] || fail 'passwordless rule does not load after wheel'
printf 'ok - passwordless sudo is installed for the current user\n'
