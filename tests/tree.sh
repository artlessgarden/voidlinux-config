#!/bin/sh
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
fail() { printf 'not ok - %s\n' "$1" >&2; exit 1; }

for path in archive/home/.emacs.d archive/home/.config/nvim \
	root/home/.config/niri root/etc/keyd root/etc/default/grub.msi \
	root/etc/default/grub.asus root/etc/grub.d/09_windows msi asus; do
	[ -e "$repo/$path" ] || fail "missing $path"
done

for path in Documents home etc home/.emacs.d home/.config/nvim \
	root/home/.config/foot root/home/.asoundrc \
	keyd grub msi/grub asus/grub 86-dns.sh etc/resolv.conf.head; do
	[ ! -e "$repo/$path" ] || fail "inactive or private path is active: $path"
done

common_files="$repo/20-pkg-base.sh $repo/40-sv-base.sh $repo/50-link-home.sh $repo/60-pkg-apps.sh $repo/70-link-apps.sh $repo/root/home/.bashrc"
if grep -Eiq 'intel|amd|sof|tlp|iwlwifi|efibootmgr|nameserver|foot|neovim|emacs' $common_files; then
	fail 'common setup contains host hardware or rejected software'
fi
grep -Fq 'module_blacklist=nouveau' "$repo/root/etc/default/grub.asus" ||
	fail 'ASUS does not disable its unused NVIDIA GPU driver'
if grep -Riq 'nouveau' $common_files "$repo/msi"; then
	fail 'ASUS-specific NVIDIA policy leaks into shared or MSI configuration'
fi
grep -q 'pipewire' "$repo/20-pkg-base.sh" || fail 'PipeWire is common'
grep -q 'wireplumber' "$repo/20-pkg-base.sh" || fail 'WirePlumber is common'
grep -q 'firefox' "$repo/60-pkg-apps.sh" || fail 'Firefox is installed on both hosts'
[ -x "$repo/90-helium.sh" ] || fail 'Helium is installed on both hosts'
[ ! -e "$repo/root/home/.config/mimeapps.list" ] || fail 'host application defaults are still shared'
grep -q 'helium.desktop' "$repo/root/home/.config/mimeapps.list.example" || fail 'fresh hosts do not default to Helium'
if grep -Fq '.config/mimeapps.list" "$HOME/.config/mimeapps.list"' "$repo/70-link-apps.sh"; then
	fail 'application defaults are still linked across hosts'
fi
[ -f "$repo/root/etc/tlp.d/10-laptop.conf" ] || fail 'TLP profile still has a user-specific filename'
if grep -Rqs '10-xfn.conf' "$repo/msi" "$repo/root/etc/tlp.d"; then
	fail 'TLP profile still uses a user-specific name'
fi

for host in msi asus; do
	if find "$repo/$host" -type f ! -name '*.sh' | grep -q .; then
		fail "$host directory contains configuration instead of scripts only"
	fi
done

if git -C "$repo" ls-files | grep -Eiq '(^|/)(accounts\.json|pppuser\.csv|\.bash_history|\.cache/|zig-cache/)'; then
	fail 'tracked tree contains personal data or build history'
fi
printf 'ok - common configuration and explicit host differences are isolated\n'
