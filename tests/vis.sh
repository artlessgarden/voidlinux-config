#!/bin/sh
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
status=$repo/root/home/.config/vis/my/status.lua
formatter=$repo/root/home/.config/vis/my/formatter.lua

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
for _, name in ipairs({"entry", "navigate", "history", "project", "completion", "cursor", "lock"}) do
  assert(not package.loaded["my." .. name], "cross-file module still loaded: " .. name)
end
assert(package.loaded["plugins/complete-word"], "stock current-file completion missing")
local win = vis.win
local text = win.file:content(0, win.file.size)
win.selection.pos = assert(text:find("true", 1, true)) - 1
require("my.toggle").boolean()
assert(require("my.formatter").format(), "format failed")
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
VIS_PATH="$tmp/vis-test" VIS_CHECK_CONFIG="$repo/root/home/.config/vis/visrc.lua" \
	VIS_CHECK_LUA="$tmp/check.lua" VIS_CHECK_RESULT="$tmp/result" TERM=xterm timeout 5 script -qec \
	"vis +check-config '$tmp/input.go'" "$tmp/edit-session" >/dev/null 2>&1 ||
	fail 'Vis editing smoke test failed'
[ "$(cat "$tmp/result" 2>/dev/null || :)" = ok ] || fail 'Vis config assertions did not execute'
grep -Fxq 'var enabled = false' "$tmp/input.go" || fail 'Vis toggle/format/save failed'

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
exit 0
EOF
cat >"$tmp/bin/python3" <<'EOF'
#!/bin/sh
printf 'python3 %s\n' "$*" >>"$VIS_TEST_LOG"
exit 0
EOF
cat >"$tmp/home/.local/src/vis/configure" <<'EOF'
#!/bin/sh
exit 0
EOF
cat >"$tmp/home/.local/bin/vis" <<'EOF'
#!/bin/sh
exit 0
EOF
chmod +x "$tmp/bin/"* "$tmp/home/.local/src/vis/configure" \
	"$tmp/home/.local/bin/vis"
VIS_TEST_LOG="$tmp/packages" HOME="$tmp/home" PATH="$tmp/bin:$PATH" \
	sh "$repo/65-vis.sh"
for package in base-devel python3 ncurses-devel lua54-devel lua54-lpeg tre-devel \
	acl-devel pkg-config; do
	grep -qw "$package" "$tmp/packages" || \
		fail "Vis installer does not install $package"
done
grep -Fq "python3 $repo/apps/vis-cjk/build.py --source $tmp/home/.local/src/vis --prefix $tmp/home/.local" "$tmp/packages" || \
	fail 'Vis installer does not use the checked temporary-build workflow'

printf 'ok - Vis config and source build dependencies are complete\n'
