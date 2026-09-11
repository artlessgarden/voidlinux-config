#!/bin/sh
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
status=$repo/root/home/.config/vis/visrc.lua
formatter=$status

fail() {
	printf 'not ok - %s\n' "$1" >&2
	exit 1
}

grep -q 'vis.ui:style_push' "$status" || fail 'status styles use the current Vis UI API'
if grep -q 'STYLE_LEXER_MAX\|win:style_define' "$status"; then
	fail 'status styles still use removed window style APIs'
fi

grep -Eq '(^|[[:space:]])go([[:space:]\\]|$)' "$repo/60-pkg-apps.sh" ||
	fail 'Go formatter is not installed'
grep -Fq 'syntax == "go"' "$formatter" || fail 'Vis does not recognize Go files'
grep -Fq 'return "gofmt"' "$formatter" || fail 'Vis does not format Go with gofmt'

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT HUP INT TERM
printf 'vis startup test\n' >"$tmp/input"
TERM=xterm timeout 5 script -qec "vis +q '$tmp/input'" "$tmp/session" >/dev/null 2>&1 || \
	fail 'Vis starts and exits through a pseudo-terminal'
if grep -a -q 'status.lua:.*attempt to\|stack traceback' "$tmp/session"; then
	fail 'Vis startup reports a Lua configuration error'
fi

# Exercise the actual loaded config and edit/save a temporary Go file.
cat >"$tmp/input.go" <<'EOF'
package main
var enabled=true
EOF
cat >"$tmp/check.lua" <<'EOF'
for _, name in ipairs({"entry", "navigate", "history", "project", "completion", "cursor", "lock", "formatter", "status"}) do
  assert(not package.loaded["my." .. name], "external personal module still loaded: " .. name)
end
assert(package.loaded["plugins/complete-word"], "stock current-file completion missing")
local win = vis.win
local stat = assert(io.open("/proc/self/stat")):read("*l")
local pid = assert(stat:match("^(%d+)"))
local hash = 5381
for i = 1, #win.file.path do hash = (hash * 33 + win.file.path:byte(i)) % 4294967296 end
local lock = assert(io.open(os.getenv("XDG_STATE_HOME") .. "/vis/locks/" .. string.format("%08x", hash) .. ".lock/pid"))
assert(lock:read("*l") == pid, "file lock does not identify the actual Vis process")
lock:close()
local text = win.file:content(0, win.file.size)
win.selection.pos = assert(text:find("true", 1, true)) - 1
vis:feedkeys("=")
assert(win.file:content(0, win.file.size):find("var enabled = true", 1, true), "format key failed")
vis:command("w")
assert(not win.file.modified, "save failed")
local result = assert(io.open(os.getenv("VIS_CHECK_RESULT"), "w"))
result:write("ok\n")
result:close()
vis:command("q")
EOF
mkdir "$tmp/vis-test"
cat >"$tmp/vis-test/visrc.lua" <<'EOF'
dofile(os.getenv("VIS_CHECK_CONFIG"))
vis:command_register("check-config", function()
  dofile(os.getenv("VIS_CHECK_LUA"))
  return true
end)
EOF
XDG_STATE_HOME="$tmp/state" VIS_PATH="$tmp/vis-test" VIS_CHECK_CONFIG="$repo/root/home/.config/vis/visrc.lua" \
	VIS_CHECK_LUA="$tmp/check.lua" VIS_CHECK_RESULT="$tmp/result" TERM=xterm timeout 5 script -qec \
	"vis +check-config '$tmp/input.go'" "$tmp/edit-session" >/dev/null 2>&1 ||
	fail 'Vis editing smoke test failed'
[ "$(cat "$tmp/result" 2>/dev/null || :)" = ok ] || fail 'Vis config assertions did not execute'
grep -Fxq 'var enabled = true' "$tmp/input.go" || fail 'Vis format/save failed'

# A second editor process must restore the position saved by the first one.
cat >"$tmp/check-cursor.lua" <<'EOF'
local f = assert(io.open(os.getenv("XDG_STATE_HOME") .. "/vis/cursors.tsv"))
local path, pos = f:read("*l"):match("^([^\t]+)\t(%d+)$")
f:close()
assert(path == vis.win.file.path and tonumber(pos) > 0)
assert(vis.win.selection.pos == tonumber(pos), "cursor position was not restored")
local result = assert(io.open(os.getenv("VIS_CHECK_RESULT"), "w"))
result:write("ok\n")
result:close()
vis:command("q")
EOF
XDG_STATE_HOME="$tmp/state" VIS_PATH="$tmp/vis-test" \
	VIS_CHECK_CONFIG="$repo/root/home/.config/vis/visrc.lua" VIS_CHECK_LUA="$tmp/check-cursor.lua" \
	VIS_CHECK_RESULT="$tmp/cursor-result" TERM=xterm timeout 5 script -qec \
	"vis +check-config '$tmp/input.go'" "$tmp/cursor-session" >/dev/null 2>&1 ||
	fail 'cursor restoration smoke test failed'
[ "$(cat "$tmp/cursor-result" 2>/dev/null || :)" = ok ] || fail 'cursor assertion did not execute'


# A clean Void install must receive every development package required by the
# features that 65-vis.sh enables explicitly.  Stub only the external package,
# network and build tools; execute the real installer script.
mkdir -p "$tmp/bin" "$tmp/home/.local/bin" "$tmp/home/.local/src/vis/.git"
cat >"$tmp/bin/sudo" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" >>"$VIS_TEST_LOG"
case " $* " in
	*' xbps-install '*-y*|*' xbps-install -'*y*) exit 0 ;;
	*) printf 'xbps install is not non-interactive\n' >&2; exit 1 ;;
esac
EOF
cat >"$tmp/bin/git" <<'EOF'
#!/bin/sh
printf 'git %s\n' "$*" >>"$VIS_TEST_LOG"
if [ "$1" = clone ]; then
	for destination do :; done
	mkdir -p "$destination"
	cat >"$destination/configure" <<'CONFIGURE'
#!/bin/sh
printf 'configure %s\n' "$*" >>"$VIS_TEST_LOG"
CONFIGURE
	chmod +x "$destination/configure"
fi
EOF
cat >"$tmp/bin/make" <<'EOF'
#!/bin/sh
printf 'make %s\n' "$*" >>"$VIS_TEST_LOG"
[ "${VIS_FAIL_TEST:-}" != "$*" ] || exit 1
if [ "$1" = install ]; then
	stage=${2#DESTDIR=}$HOME/.local
	mkdir -p "$stage/bin" "$stage/share/vis"
	printf '#!/bin/sh\nexit 0\n' >"$stage/bin/vis"
	chmod +x "$stage/bin/vis"
	printf 'runtime\n' >"$stage/share/vis/vis.lua"
fi
EOF
printf '#!/bin/sh\n# previous executable\nexit 0\n' >"$tmp/home/.local/bin/vis"
cp "$tmp/home/.local/bin/vis" "$tmp/previous"
chmod +x "$tmp/bin/"* "$tmp/home/.local/bin/vis"
VIS_TEST_LOG="$tmp/packages" HOME="$tmp/home" PATH="$tmp/bin:$PATH" \
	sh "$repo/65-vis.sh" >/dev/null
for package in base-devel ncurses-devel lua54-devel lua54-lpeg tre-devel \
	acl-devel pkg-config; do
	grep -qw "$package" "$tmp/packages" || \
		fail "Vis installer does not install $package"
done
for suite in core lua vis; do
	grep -Fxq "make -C test/$suite" "$tmp/packages" || fail "missing upstream test: $suite"
done
cmp "$tmp/previous" "$tmp/home/.local/bin/vis.previous" || fail 'previous executable not preserved'
[ -f "$tmp/home/.local/share/vis/vis.lua" ] || fail 'native runtime not installed'
cp "$tmp/home/.local/bin/vis" "$tmp/installed"
if VIS_FAIL_TEST='-C test/lua' VIS_TEST_LOG="$tmp/packages" HOME="$tmp/home" PATH="$tmp/bin:$PATH" \
	sh "$repo/65-vis.sh" >/dev/null 2>&1; then
	fail 'installer continued after upstream test failure'
fi
cmp "$tmp/installed" "$tmp/home/.local/bin/vis" || fail 'failed build replaced working executable'

printf 'ok - Vis config and source build dependencies are complete\n'
