local home = os.getenv("HOME") or "."
local config = home .. "/.config/vis"
package.path = config .. "/?.lua;" .. config .. "/?/init.lua;" .. package.path

require("vis")
require("plugins/filetype")
require("plugins/complete-word")

local formatter = require("my.formatter")
local toggle = require("my.toggle")
require("my.theme")
require("my.fcitx")
require("my.cursor")
require("my.lock")
require("my.status")

-- LF owns file navigation; Vis only adds editing actions for the current file.
vis.events.subscribe(vis.events.INIT, function()
	for _, mode in ipairs({ vis.modes.NORMAL, vis.modes.VISUAL }) do
		vis:map(mode, " y", "<vis-register>+<vis-operator-yank>", "yank to system clipboard")
		vis:map(mode, " p", "<vis-register>+<vis-put-after>", "paste from system clipboard")
	end
	vis:map(vis.modes.NORMAL, " t", toggle.boolean, "toggle true/false")
	vis:map(vis.modes.NORMAL, "=", function()
		formatter.format()
		return true
	end, "format current file")
end)

vis.events.subscribe(vis.events.WIN_OPEN, function()
	vis:command("set autoindent on")
	vis:command("set tabwidth 4")
end)
