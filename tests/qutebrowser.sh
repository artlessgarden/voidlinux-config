#!/bin/sh
# Build real binaries, then check their native XBPS metadata and loader paths.
set -eu
dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
sh "$dir/95-qutebrowser.sh" --build-only
repo=${XDG_CACHE_HOME:-$HOME/.cache}/qutebrowser-xbps
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
python3 - "$repo" "$tmp" <<'PY'
import pathlib, plistlib, shutil, subprocess, sys, tarfile
repo, dest = map(pathlib.Path, sys.argv[1:])
with tarfile.open(repo / 'qt6-webengine-6.11.2_1.x86_64.xbps') as archive:
    props = plistlib.load(archive.extractfile('./props.plist'))
    archive.extractall(dest, filter='data')
assert props['pkgname'] == 'qt6-webengine'
assert 'libQt6WebEngineCore.so.6' in props['shlib-provides']
assert 'qt6-core>=6.12' in props['conflicts']
core = dest / 'usr/lib/libQt6WebEngineCore.so.6'
assert core.resolve().is_file()
assert subprocess.check_output(['patchelf', '--print-rpath', core], text=True).strip() == '/usr/lib/qtwebengine-hw'
process = dest / 'usr/lib/qt6/libexec/QtWebEngineProcess'
assert subprocess.check_output(['patchelf', '--print-interpreter', process], text=True).strip() == '/lib64/ld-linux-x86-64.so.2'
assert (dest / 'usr/lib/qtwebengine-hw/libxml2.so.16').resolve().is_file()
assert not (dest / 'usr/lib/libxml2.so.16').exists()
assert (dest / 'usr/share/qt6/resources/qtwebengine_resources.pak').is_file()
assert (dest / 'usr/share/qt6/translations/qtwebengine_locales/en-US.pak').is_file()
assert (dest / 'usr/lib/qt6/qml/QtWebEngine/libqtwebenginequickplugin.so').is_file()
print('PASS: native package, private libxml2, process, resources and QML')
root = dest / 'fresh-root'
db = root / 'var/db/xbps'
db.mkdir(parents=True)
for source in pathlib.Path('/var/db/xbps').glob('https*'):
    shutil.copytree(source, db / source.name)
plan = subprocess.check_output([
    'xbps-install', '-n', '-r', str(root), '-i', '-R', str(repo),
    '-R', 'https://repo-fastly.voidlinux.org/current', 'qutebrowser',
], text=True)
engines = [line for line in plan.splitlines() if line.startswith('qt6-webengine-')]
assert len(engines) == 1 and str(repo) in engines[0], plan
print('PASS: fresh qutebrowser install selects only the local WebEngine package')
PY

# A corrupt cache must fail before it can produce/install a package.
mkdir -p "$tmp/bad-cache/qutebrowser-xbps"
printf broken >"$tmp/bad-cache/qutebrowser-xbps/1b1f9666f90094609bff11ca4f16655ec09f352f18c2d2566ba01b1c00f4c64a.tar.gz"
if XDG_CACHE_HOME="$tmp/bad-cache" sh "$dir/95-qutebrowser.sh" --build-only >"$tmp/error" 2>&1; then
	echo 'FAIL: corrupt archive accepted' >&2
	exit 1
fi
rg -q 'SHA256 校验失败' "$tmp/error"
echo 'PASS: corrupt download rejected'
