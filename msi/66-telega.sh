#!/bin/sh
# Build TDLib and the helper for the Emacs telega client.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
prefix=$HOME/.local/opt/tdlib
source=$HOME/.local/src/tdlib
build=$HOME/.cache/telega-build/latest

sudo xbps-install -y git cmake ninja gperf gcc make pkg-config openssl-devel zlib-devel \
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
  (princ (file-name-directory (locate-library "telega"))))')

mkdir -p "$(dirname "$source")"
if [ -d "$source/.git" ]; then
	git -C "$source" pull --ff-only
else
	git clone --depth=1 --branch master https://github.com/tdlib/td.git "$source"
fi
revision=$(git -C "$source" rev-parse HEAD)
if [ ! -f "$prefix/.revision" ] || [ "$(cat "$prefix/.revision")" != "$revision" ]; then
	cmake -S "$source" -B "$build" -G Ninja -DCMAKE_BUILD_TYPE=Release \
		'-DCMAKE_CXX_FLAGS_RELEASE=-O2 -DNDEBUG' -DCMAKE_INSTALL_PREFIX="$prefix" \
		-DCMAKE_INSTALL_LIBDIR=lib -DTD_INSTALL_STATIC_LIBRARIES=OFF \
		-DTD_INSTALL_SHARED_LIBRARIES=ON
	cmake --build "$build" --target tdjson -j "${TELEGA_BUILD_JOBS:-4}"
	cmake --install "$build"
	printf '%s\n' "$revision" >"$prefix/.revision"
fi

data=${XDG_DATA_HOME:-$HOME/.local/share}/telega
mkdir -p "$data"
chmod 700 "$data"
make -B -C "$package_dir/server" LIBS_PREFIX="$prefix" INSTALL_PREFIX="$data" install
"$data/telega-server" -h
printf '%s\n' 'telega 已安装。重新启动 telega 后使用新 TDLib；首次使用按 C-c T 或 M-x telega 登录。'
