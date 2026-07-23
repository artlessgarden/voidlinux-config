#
# ~/.bashrc
#

# 非交互 shell 不加载这些配置
[[ $- != *i* ]] && return
# Prompt
PS1='\n\[\e[1m\]\A \W\$ \[\e[0m\]'

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

alias ld='ls -Alh --color=auto'
alias cx='chmod +x'
alias gl='git clone --depth=1'

# 从 TTY 启动主 Niri 会话：
# - 系统 seatd 允许普通用户访问显卡和输入设备；
# - dbus-run-session 创建本次登录的用户会话 D-Bus；
# - niri --session 导入 Wayland 环境并启动 Niri 的 D-Bus 服务。
ni() {
	if [[ -n ${WAYLAND_DISPLAY:-} ]]; then
		printf 'Niri is already running.\n' >&2
		return 1
	fi
	export XDG_RUNTIME_DIR="/tmp/xdg-runtime-$UID"
	export XDG_CURRENT_DESKTOP=niri
	export XDG_SESSION_DESKTOP=niri
	export XDG_SESSION_TYPE=wayland
	install -d -m 700 "$XDG_RUNTIME_DIR" || return
	dbus-run-session niri --session
}


# 历史记录
HISTSIZE=100000
HISTFILESIZE=200000
HISTCONTROL=ignoreboth:erasedups
# 多行命令按一条记录保存；追加历史，不覆盖；保留换行。
shopt -s cmdhist histappend lithist
# 每次回到提示符就写入新历史；不反复导入其他终端的历史。
PROMPT_COMMAND='history -a'

fastfetch
