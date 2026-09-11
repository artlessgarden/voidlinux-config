#!/bin/sh
# Build TDLib and the helper for the Emacs telega client.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
revision=022d60202e446ad1287b9fb68e687c8a0760788b
checksum=b0837cd880a6de8d45abdfd5024fe0f042c100eb5f241a5f185ba65579acfc32
prefix=$HOME/.local/opt/tdlib-1.8.66
cache=$HOME/.cache/telega-build
archive=$cache/td-022d60202.tar.gz
source=$cache/td-$revision
build=$cache/build-022d60202

sudo xbps-install -y cmake ninja gperf gcc make pkg-config openssl-devel zlib-devel \
	ffmpeg mpv libwebp-tools noto-fonts-emoji qrencode

# Install the Lisp package separately so an unavailable dependency stops setup.
package_dir=$(emacs --batch -Q \
	--eval '(setq user-emacs-directory (expand-file-name "~/.config/emacs/"))' \
	-l "$repo/root/home/.config/emacs/early-init.el" \
	--eval '(progn
  (require (quote package))
  (add-to-list (quote package-archives) (cons "melpa" "https://melpa.org/packages/") t)
  (package-initialize)
  (unless (package-installed-p (quote telega))
    (package-refresh-contents)
    (package-install (quote telega)))
  (require (quote telega))
  (unless (equal telega-tdlib-min-version "1.8.66")
    (error "Update the pinned TDLib revision in msi/66-telega.sh for this telega version"))
  (princ (file-name-directory (locate-library "telega"))))')

if [ ! -f "$prefix/.revision" ] || [ "$(cat "$prefix/.revision")" != "$revision" ]; then
	mkdir -p "$cache"
	if [ ! -f "$archive" ]; then
		curl -fL "https://codeload.github.com/tdlib/td/tar.gz/$revision" -o "$archive"
	fi
	printf '%s  %s\n' "$checksum" "$archive" | sha256sum -c -
	[ -d "$source" ] || tar -xzf "$archive" -C "$cache"
	cmake -S "$source" -B "$build" -G Ninja -DCMAKE_BUILD_TYPE=Release \
		'-DCMAKE_CXX_FLAGS_RELEASE=-O2 -DNDEBUG' -DCMAKE_INSTALL_PREFIX="$prefix" \
		-DCMAKE_INSTALL_LIBDIR=lib -DTD_INSTALL_STATIC_LIBRARIES=OFF \
		-DTD_INSTALL_SHARED_LIBRARIES=ON
	cmake --build "$build" --target tdjson -j "${TELEGA_BUILD_JOBS:-4}"
	cmake --install "$build"
	printf '%s\n' "$revision" > "$prefix/.revision"
fi

data=${XDG_DATA_HOME:-$HOME/.local/share}/telega
mkdir -p "$data"
chmod 700 "$data"
make -C "$package_dir/server" LIBS_PREFIX="$prefix" INSTALL_PREFIX="$data" install
"$data/telega-server" -h
printf '%s\n' 'telega 已安装。重新打开图形版 Emacs，按 C-c T 或 M-x telega 扫码登录。'
