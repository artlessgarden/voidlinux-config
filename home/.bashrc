#
# ~/.bashrc
#

# 非交互 shell 不加载这些配置
[[ $- != *i* ]] && return
# Prompt
PS1='\[\e[1m\]\A \W\$ \[\e[0m\]'

# 补全和 fzf
[[ $PS1 && -f /usr/share/bash-completion/bash_completion ]] &&
	. /usr/share/bash-completion/bash_completion

if command -v fzf >/dev/null 2>&1; then
	# 加载 fzf 快捷键和补全：Ctrl-T 文件，Alt-C 目录，Ctrl-R 历史。
	eval "$(fzf --bash)"
	# 紧凑样式，默认按精确匹配筛选。
	export FZF_COMPLETION_OPTS='--info=inline'
	export FZF_DEFAULT_OPTS='--style minimal --layout reverse --info inline --exact'
	# 选中文件/目录时只预览，不打开。
	export FZF_CTRL_T_OPTS="--preview 'sed -n \"1,120p\" {}' --preview-window right,50%,noborder"
	export FZF_ALT_C_OPTS="--preview 'ls -la --color=always {}' --preview-window right,50%,noborder"
	# 用 fd 列文件：包含隐藏文件；忽略规则集中放在 ~/.config/fd/ignore。
	export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow'
	export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
fi

# shell 行为
set -o noclobber
shopt -s checkwinsize

export EDITOR=vis
export VISUAL=vis
export BROWSER=helium

# lf：退出后 shell 留在上次浏览的目录（桌面入口仍直接调 /usr/bin/lf）
lfcd() {
	cd "$(command lf -print-last-dir "$@")" || return
}
alias lf=lfcd

alias ld='ls -Alh --color=auto'
alias cx='chmod +x'
alias gl='git clone --depth=1'

# 从 TTY 启动合成器：
# seatd + dbus-run-session；niri --session / sway 导入 Wayland 环境。
ni() {
	if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
		printf 'Wayland session already running.\n' >&2
		return 1
	fi
	export XDG_RUNTIME_DIR="/tmp/xdg-runtime-$UID"
	export XDG_CURRENT_DESKTOP=niri
	export XDG_SESSION_DESKTOP=niri
	export XDG_SESSION_TYPE=wayland
	install -d -m 700 "$XDG_RUNTIME_DIR" || return
	dbus-run-session niri --session
}

# Sway（自 niri 迁移试用）
sw() {
	if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
		printf 'Wayland session already running.\n' >&2
		return 1
	fi
	export XDG_RUNTIME_DIR="/tmp/xdg-runtime-$UID"
	export XDG_CURRENT_DESKTOP=sway
	export XDG_SESSION_DESKTOP=sway
	export XDG_SESSION_TYPE=wayland
	export XCURSOR_THEME=Adwaita
	export XCURSOR_SIZE=24
	export GTK_IM_MODULE=fcitx
	export QT_IM_MODULE=fcitx
	export XMODIFIERS=@im=fcitx
	install -d -m 700 "$XDG_RUNTIME_DIR" || return
	dbus-run-session sway
}

# River + tri（左主/右列手风琴 WM）
rv() {
	if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
		printf 'Wayland session already running.\n' >&2
		return 1
	fi
	export XDG_RUNTIME_DIR="/tmp/xdg-runtime-$UID"
	export XDG_CURRENT_DESKTOP=river
	export XDG_SESSION_DESKTOP=river
	export XDG_SESSION_TYPE=wayland
	export XCURSOR_THEME=Adwaita
	export XCURSOR_SIZE=24
	# 见 session.sh：Wayland 下勿设 GTK_IM_MODULE=fcitx
	unset GTK_IM_MODULE
	export QT_IM_MODULE=fcitx
	export QT_IM_MODULES="wayland;fcitx"
	export XMODIFIERS=@im=fcitx
	export PATH="$HOME/.local/bin:$PATH"
	install -d -m 700 "$XDG_RUNTIME_DIR" || return
	# session.sh: wallpaper/input/idle then exec tri
	dbus-run-session river -c "$HOME/.local/bin/tri-session"
}


# 历史记录
HISTSIZE=100000
HISTFILESIZE=200000
HISTCONTROL=ignoreboth:erasedups
# 多行命令按一条记录保存；追加历史，不覆盖；保留换行。
shopt -s cmdhist histappend lithist
# 每次回到提示符：更新 Wayland 窗口标题（tri 收起条显示路径）+ 写入历史
_tri_set_title() {
	printf '\033]0;%s@%s:%s\033\\' "$USER" "${HOSTNAME%%.*}" "${PWD/#$HOME/~}"
}

PROMPT_COMMAND='_tri_set_title; history -a'
