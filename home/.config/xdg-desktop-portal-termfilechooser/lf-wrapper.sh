#!/bin/sh

# 门户：选文件用 -selection-path（对文件按 Enter/l 即确认）
# 选目录：Enter = 确认高亮文件夹并退出；l = 仍进入子目录

set -eu

multiple=$1
directory=$2
save=$3
path=$4
out=$5
debug=$6

[ "$debug" = 1 ] && set -x

termcmd=${TERMCMD:-alacritty --title termfilechooser -e}

if [ "$directory" = 1 ]; then
	export LF_XDG_OUT=$out
	set -- -single -command 'map <enter> :{{ portal-accept; quit }}' "$path"
else
	unset LF_XDG_OUT || true
	set -- -single -selection-path "$out" "$path"
fi

command="$termcmd lf"
for arg in "$@"; do
	escaped=$(printf '%s' "$arg" | sed 's/"/\\"/g')
	command="$command \"$escaped\""
done

sh -c "$command"
