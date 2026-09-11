# Keep the shell in the directory last visited by lf.
lfcd() {
	cd "$(command lf -print-last-dir "$@")" || return
}
alias lf=lfcd

