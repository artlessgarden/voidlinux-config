#!/bin/sh
set -eu

repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
lfrc=$repo/root/home/.config/lf/lfrc
file_lfrc=$repo/root/home/.config/lf/xdg-file.lfrc
directory_lfrc=$repo/root/home/.config/lf/xdg-directory.lfrc
chooser=$repo/root/home/.config/xdg-desktop-portal-termfilechooser/lf-wrapper.sh
preview=$repo/root/home/.config/lf/preview
archive=$repo/root/home/.local/bin/lf-archive
detach=$repo/root/home/.local/bin/lf-detach
open_with=$repo/root/home/.local/bin/lf-open-with
show_items=$repo/root/home/.local/bin/lf-show-items
portal=$repo/root/home/.config/xdg-desktop-portal/niri-portals.conf

fail() {
	printf 'not ok - %s\n' "$1" >&2
	exit 1
}

[ -f "$lfrc" ] || fail 'LF main configuration exists'
[ -x "$preview" ] || fail 'LF previewer is executable'
[ -x "$archive" ] || fail 'safe LF archive helper exists'
[ -x "$detach" ] || fail 'detached launcher exists'
[ -x "$open_with" ] || fail 'open-with helper exists'
[ -x "$show_items" ] || fail 'FileManager1 ShowItems adapter exists'
grep -Fx 'org.freedesktop.impl.portal.FileChooser=termfilechooser' "$portal" >/dev/null ||
	fail 'Niri selects the terminal file chooser portal'
if grep -Eiq 'river|wlr' "$portal"; then
	fail 'Niri portal config contains stale River or wlroots backends'
fi
[ ! -e "$repo/root/home/.config/xdg-desktop-portal/river-portals.conf" ] ||
	fail 'stale River portal selector remains'
sh -n "$preview"
sh -n "$archive"
sh -n "$open_with"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
printf 'alpha\nbeta\n' >"$tmp/a file.txt"

preview_out=$($preview "$tmp/a file.txt" 80 20)
printf '%s\n' "$preview_out" | grep -q alpha || fail 'text preview returns file contents'

(cd "$tmp" && "$archive" tar bundle.tar.gz 'a file.txt')
[ -f "$tmp/a file.txt" ] || fail 'tar creation preserves selected input'
tar -tzf "$tmp/bundle.tar.gz" | grep -q 'a file.txt' || fail 'tar contains selected input'

if (cd "$tmp" && "$archive" tar bundle.tar.gz 'a file.txt') >/dev/null 2>&1; then
	fail 'archive helper overwrites an existing output'
fi

if (cd "$tmp" && "$archive" tar '' 'a file.txt') >/dev/null 2>&1; then
	fail 'archive helper accepts an empty output name'
fi

# A GUI child must outlive the terminal-side process that launched it.
cat >"$tmp/gui-child" <<'EOF'
#!/bin/sh
sleep 0.2
printf 'alive\n' >"$LF_TEST_ALIVE"
EOF
chmod +x "$tmp/gui-child"
LF_TEST_ALIVE="$tmp/alive" "$detach" "$tmp/gui-child"
i=0
while [ ! -s "$tmp/alive" ] && [ "$i" -lt 20 ]; do
	sleep 0.05
	i=$((i + 1))
done
[ "$(cat "$tmp/alive" 2>/dev/null || :)" = alive ] ||
	fail 'detached GUI process survives its launcher'

# ShowItems must preserve and select the file, not reduce it to its parent.
mkdir "$tmp/bin"
cat >"$tmp/bin/alacritty" <<'EOF'
#!/bin/sh
printf '%s\n' "$@" >"$LF_TEST_ARGS"
EOF
chmod +x "$tmp/bin/alacritty"
LF_TEST_ARGS="$tmp/args" PATH="$tmp/bin:$PATH" \
	"$show_items" 'file:///tmp/a%20file%25.txt'
i=0
while [ ! -s "$tmp/args" ] && [ "$i" -lt 20 ]; do
	sleep 0.05
	i=$((i + 1))
done
expected=$(printf '%s\n' '--title' 'lf: /tmp/a file%.txt' '-e' 'lf' '-single' '/tmp/a file%.txt')
[ "$(cat "$tmp/args" 2>/dev/null || :)" = "$expected" ] ||
	fail 'ShowItems selects the decoded file path in lf'

# Open-with must preserve every selected path and detach the chosen app.
cat >"$tmp/bin/lf-detach" <<'EOF'
#!/bin/sh
printf '%s\n' "$@" >"$LF_TEST_ARGS"
EOF
chmod +x "$tmp/bin/lf-detach"
LF_TEST_ARGS="$tmp/open-with-args" PATH="$tmp/bin:$PATH" \
	"$open_with" imv "$tmp/a file.txt" "$tmp/second file.jpg"
expected=$(printf '%s\n' 'imv' '--' "$tmp/a file.txt" "$tmp/second file.jpg")
[ "$(cat "$tmp/open-with-args")" = "$expected" ] ||
	fail 'open-with does not preserve the app and all selected paths'
if "$open_with" >/dev/null 2>&1; then
	fail 'open-with accepts a missing application'
fi

printf 'ok - LF previews text and archives selections without deleting input\n'

grep -Fq 'gio trash -- $fx' "$lfrc" || fail 'D does not use the standard trash'
grep -Fxq 'map D trash' "$lfrc" || fail 'D is not mapped to trash'
grep -Fxq 'nmap <esc> :unselect; clear; setfilter' "$lfrc" || fail 'Escape does not clear selections in normal mode'
grep -Fxq 'vmap <esc> :visual-discard; unselect; clear; setfilter' "$lfrc" ||
	fail 'Escape does not exit visual mode before clearing state'
grep -Fxq 'cmap <esc> :cmd-escape; unselect; clear; setfilter' "$lfrc" ||
	fail 'Escape does not exit command-line mode before clearing state'
if grep -Eq '^map <esc>([[:space:]]|$)' "$lfrc"; then
	fail 'Escape selection clearing overrides visual mode'
fi
grep -Fq "printf '%s\\n' \$fx | wl-copy" "$lfrc" || fail 'full paths cannot be copied'
grep -Fq 'basename -- "$path"' "$lfrc" || fail 'file names cannot be copied'
if grep -Eq '^map y([[:space:]]|$)' "$lfrc"; then
	fail 'LF native y copy binding is overridden'
fi
grep -Fxq 'map gp copy_path' "$lfrc" || fail 'gp does not copy paths'
grep -Fxq 'map gn copy_name' "$lfrc" || fail 'gn does not copy names'
grep -Fq 'cmd open-with ${{' "$lfrc" || fail ':open-with command is missing'
grep -Fq 'lf-open-with "$@" $fx' "$lfrc" || fail ':open-with does not pass all selected files'
grep -Fq '[ -d "$f" ]' "$lfrc" || fail 'open does not distinguish directories from files'
grep -Fq 'send $id cd' "$lfrc" || fail 'Enter cannot enter the highlighted directory'
grep -Fq 'target=$(realpath -- "$target")' "$lfrc" || fail 'fzf jumps do not resolve an unambiguous absolute target'
grep -Fxq 'source ~/.config/lf/lfrc' "$file_lfrc" || fail 'file chooser does not reuse the main LF config'
grep -Fxq 'source ~/.config/lf/lfrc' "$directory_lfrc" || fail 'directory chooser does not reuse the main LF config'
grep -Fq 'cmd open ${{' "$file_lfrc" || fail 'file chooser does not replace normal app opening with file selection'
grep -Fxq 'map <enter> open' "$file_lfrc" || fail 'file chooser Enter does not use file-or-directory open semantics'
grep -Fxq 'map <enter> xdg-accept-directory' "$directory_lfrc" || fail 'directory chooser Enter does not confirm the selected directory'
if grep -Fq -- '-single' "$chooser"; then
	fail 'portal LF disables remote jumps with -single'
fi
sh -n "$chooser"
grep -Fxq 'set dircounts' "$lfrc" || fail 'directory item counts are not enabled'
if grep -Eq '^map zc([[:space:]]|$)' "$lfrc"; then
	fail 'directory counts can still be disabled globally'
fi
grep -Fq 'size=$(du -sh -- "$f" | cut -f1)' "$lfrc" || fail 'directory size is not extracted without its tab-separated path'
grep -Fq "printf '目录大小: %s\\n' \"\$size\"" "$lfrc" || fail 'directory size has no compact bottom-line message'
if grep -Eq '^[[:space:]]*du -sh -- "\$f"[[:space:]]*$' "$lfrc"; then
	fail 'raw du output still leaks a tab and full path into the bottom line'
fi
grep -Fxq 'map zd dir_size' "$lfrc" || fail 'zd does not show the current directory size'
if grep -Fq 'set nodircounts' "$lfrc"; then
	fail 'calculating one directory still disables counts globally'
fi
grep -Fxq 'set infotimefmtnew "01-02 15:04"' "$lfrc" || fail 'current-year dates are not compact numeric values'
grep -Fxq 'set infotimefmtold "2006-01-02"' "$lfrc" || fail 'older dates are not numeric values'
grep -Fxq 'set timefmt "2006-01-02 15:04:05"' "$lfrc" || fail 'bottom timestamps are not numeric values'
if grep -Fq '/home/xfn' "$lfrc"; then
	fail 'LF configuration contains a hard-coded user home'
fi
grep -Fq 'exec "$HOME/.local/bin/lf-show-items" --service' "$repo/root/home/.local/share/dbus-1/services/org.freedesktop.FileManager1.service" ||
	fail 'FileManager1 service contains a hard-coded user executable path'
printf 'ok - LF has recoverable deletion and compact file utilities\n'

# File names are arguments, never shell source (including dollars and backticks).
special_path='/tmp/lf "$HOME" `printf changed` \ file.txt'
LF_TEST_ARGS="$tmp/chooser-args" TERMCMD="$tmp/bin/alacritty" \
	"$chooser" 0 0 0 "$special_path" "$tmp/selection" 0
expected=$(printf '%s\n' lf -config "$HOME/.config/lf/xdg-file.lfrc" "$special_path")
[ "$(cat "$tmp/chooser-args")" = "$expected" ] ||
	fail 'file chooser expands shell syntax in a file path'
printf 'ok - LF chooser preserves special characters in paths\n'
