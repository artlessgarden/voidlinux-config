-- 个人编辑增强；文件切换使用原生 :e，工作目录使用 :cd。
-- 原生 require("vis") 已加载语法识别、单词和路径补全。
require("vis")
local vis = vis
local home = os.getenv("HOME") or "."
local state_dir = (os.getenv("XDG_STATE_HOME") or (home .. "/.local/state")) .. "/vis"

-- 小工具：路径转义和本地状态文件。
local function shquote(value)
	return "'" .. tostring(value or ""):gsub("'", "'\\''") .. "'"
end

local function home_shorten(path)
	if path == home or path:sub(1, #home + 1) == home .. "/" then
		return "~" .. path:sub(#home + 1)
	end
	return path
end

local function os_ok(command)
	local ok, _, code = os.execute(command)
	return ok == true or ok == 0 or code == 0
end

local function mkdir_p(path)
	if not path or path == "" then
		return false
	end
	return os_ok("mkdir -p " .. shquote(path))
end

local function write_all(path, data)
	local file = io.open(path, "wb")
	if not file then
		return false
	end
	file:write(data or "")
	file:close()
	return true
end

-- 配色：内嵌主题，不依赖外部主题文件。
package.preload["themes/mytheme-dark"] = function()
	local lexers = vis.lexers

	lexers.STYLE_DEFAULT = "fore:#dddddd,back:#0e1415"
	lexers.STYLE_NOTHING = ""

	lexers.STYLE_ATTRIBUTE = "fore:#aaaaaa"
	lexers.STYLE_CLASS = "fore:#dddddd"
	lexers.STYLE_COMMENT = "fore:#dfdf8e"
	lexers.STYLE_CONSTANT = "fore:#dddddd"
	lexers.STYLE_DEFINITION = "fore:#dddddd"
	lexers.STYLE_ERROR = "fore:#ffc0b9"
	lexers.STYLE_FUNCTION = "bold,fore:#dddddd"
	lexers.STYLE_KEYWORD = "fore:#aaaaaa"
	lexers.STYLE_LABEL = "fore:#9ca8c8"
	lexers.STYLE_NUMBER = "fore:#95cb82"
	lexers.STYLE_OPERATOR = "fore:#aaaaaa"
	lexers.STYLE_REGEX = "fore:#95cb82"
	lexers.STYLE_STRING = "fore:#95cb82"
	lexers.STYLE_CODE = "fore:#dddddd,back:#161f21"
	lexers.STYLE_PREPROCESSOR = "fore:#dddddd"
	lexers.STYLE_TAG = "fore:#dddddd"
	lexers.STYLE_TAG_CHARS = "fore:#aaaaaa"
	lexers.STYLE_TAG_UNKNOWN = lexers.STYLE_TAG
	lexers.STYLE_TYPE = "fore:#dddddd"
	lexers.STYLE_VARIABLE = "fore:#dddddd"
	lexers.STYLE_WHITESPACE = "fore:#4f5258"
	lexers.STYLE_EMBEDDED = "fore:#aaaaaa"
	lexers.STYLE_IDENTIFIER = "fore:#dddddd"

	lexers.STYLE_LINENUMBER = "fore:#4f5258"
	lexers.STYLE_LINENUMBER_CURSOR = "bold"
	lexers.STYLE_CURSOR = "back:#999999"
	lexers.STYLE_CURSOR_PRIMARY = "back:#ffffff"
	lexers.STYLE_CURSOR_LINE = "back:#161f21"
	lexers.STYLE_COLOR_COLUMN = "back:#161f21"
	lexers.STYLE_SELECTION = "back:#424633"
	lexers.STYLE_STATUS = "fore:#aaaaaa,back:#1e2b2d"
	lexers.STYLE_STATUS_FOCUSED = "fore:#dddddd,back:#1e2b2d"
	lexers.STYLE_SEPARATOR = ""
	lexers.STYLE_INFO = ""
	lexers.STYLE_EOF = "fore:#4f5258"
end

-- 基本设置与系统剪贴板。布尔值切换保持停用，旧实现见归档。
vis.events.subscribe(vis.events.INIT, function()
	vis:command("set theme mytheme-dark")
	for _, mode in ipairs({ vis.modes.NORMAL, vis.modes.VISUAL }) do
		vis:map(mode, " y", "<vis-register>+<vis-operator-yank>", "yank to system clipboard")
		vis:map(mode, " p", "<vis-register>+<vis-put-after>", "paste from system clipboard")
	end
end)
vis.events.subscribe(vis.events.WIN_OPEN, function()
	vis:command("set autoindent on")
	vis:command("set tabwidth 2")
end)

-- 手动格式化：普通模式按 =，需要对应 formatter 已安装。
do
	local prettier_syntax = {}
	for syntax in ("css html javascript json jsx markdown tsx typescript yaml"):gmatch("%S+") do
		prettier_syntax[syntax] = true
	end

	local function with_path(win, option)
		local path = win.file and win.file.path
		if not path or path == "" then
			return ""
		end
		return option .. shquote(path)
	end

	-- 按文件类型选择外部格式化程序。
	local function default_command(win)
		local syntax = win.syntax or ""

		if prettier_syntax[syntax] then
			return "prettier" .. with_path(win, " --stdin-filepath ")
		end
		if syntax == "lua" then
			return "stylua -"
		end
		if syntax == "bash" or syntax == "sh" then
			return "shfmt" .. with_path(win, " --filename ") .. " -"
		end
		if syntax == "python" then
			return "ruff format" .. with_path(win, " --stdin-filename ") .. " -"
		end
		if syntax == "go" then
			return "gofmt"
		end

		return nil
	end

	-- 仅格式化当前文件，不自动保存；失败时保留原文。
	local function format()
		local win = vis.win
		if not win or not win.file then
			return true
		end

		local command = default_command(win)
		if not command then
			vis:info("fmt: no formatter for syntax " .. tostring(win.syntax or "text"))
			return true
		end

		local file = win.file
		local before = file:content(0, file.size)
		local line = win.selection and win.selection.line or 1
		local col = win.selection and win.selection.col or 1
		local status, out, err = vis:pipe(file, { start = 0, finish = file.size }, command)

		if status ~= 0 then
			local msg = (err and err ~= "") and err or ("exit " .. tostring(status))
			vis:message("fmt failed:\n" .. msg:gsub("\n$", ""))
			return false
		end

		out = out or ""
		if out ~= before then
			file:delete(0, file.size)
			file:insert(0, out)
			win.selection:to(math.min(line, math.max(1, #file.lines)), math.max(1, col))
		end

		vis:info("fmt: " .. command)
		return true
	end

	vis.events.subscribe(vis.events.INIT, function()
		vis:map(vis.modes.NORMAL, "=", function()
			format()
			return true
		end, "format current file")
	end)
end

-- 输入法：离开插入／替换模式时关闭中文输入。
do
	local last_mode = nil

	local function input_mode(mode)
		return mode == vis.modes.INSERT or mode == vis.modes.REPLACE
	end

	local function observe_mode(win)
		if win ~= vis.win then
			return nil
		end

		local mode = vis.mode
		if input_mode(last_mode) and not input_mode(mode) then
			os.execute("fcitx5-remote -c >/dev/null 2>&1 &")
		end

		last_mode = mode
		return nil
	end

	vis.events.subscribe(vis.events.WIN_STATUS, observe_mode)
end

-- 光标位置：保存在 ~/.local/state/vis/cursors.tsv，重新打开时恢复。
do
	local cursor_path = state_dir .. "/cursors.tsv"
	local cursor_max = 1000

	local cursors = {}
	local order = {}

	local function ignored(path)
		return not path or path:match("COMMIT_EDITMSG$") or path:match("git%-rebase%-todo$")
	end

	local function move_front(list, path)
		if not path or path == "" then
			return
		end
		for i = #list, 1, -1 do
			if list[i] == path then
				table.remove(list, i)
			end
		end
		table.insert(list, 1, path)
	end

	local function read()
		cursors = {}
		order = {}

		local file = io.open(cursor_path, "r")
		if not file then
			return
		end
		for line in file:lines() do
			local path, pos = line:match("^([^\t]+)\t(%d+)$")
			if path and pos then
				cursors[path] = tonumber(pos)
				table.insert(order, path)
			end
		end
		file:close()
	end

	local function write()
		mkdir_p(state_dir)

		local file = io.open(cursor_path, "w")
		if not file then
			return
		end

		local seen = {}
		local written = 0
		for _, path in ipairs(order) do
			local pos = cursors[path]
			if pos and not seen[path] then
				file:write(path, "\t", tostring(pos), "\n")
				seen[path] = true
				written = written + 1
				if written >= cursor_max then
					break
				end
			end
		end
		file:close()
	end

	local function remember(win)
		if not win or not win.file or not win.file.path or not win.selection then
			return
		end

		local path = win.file.path
		if ignored(path) then
			return
		end

		move_front(order, path)
		cursors[path] = win.selection.pos or 0
	end

	local function restore(win)
		if not win or not win.file or not win.file.path or not win.selection then
			return
		end

		local path = win.file.path
		if ignored(path) then
			return
		end

		local pos = cursors[path]
		if pos and pos > 0 and pos <= win.file.size then
			win.selection.pos = pos
			vis:feedkeys("zz")
		end
	end

	vis.events.subscribe(vis.events.INIT, read)
	vis.events.subscribe(vis.events.WIN_OPEN, restore)
	vis.events.subscribe(vis.events.WIN_CLOSE, remember)
	vis.events.subscribe(vis.events.QUIT, function()
		for win in vis:windows() do
			remember(win)
		end
		write()
	end)
end

-- 文件锁：提示其他 Vis 已打开同一文件，不强制禁止写入。
do
	local root = state_dir .. "/locks"
	local held = {}
	local pid

	local function hash(path)
		local h = 5381
		for i = 1, #path do
			h = (h * 33 + path:byte(i)) % 4294967296
		end
		return string.format("%08x", h)
	end

	local function current_pid()
		if pid then
			return pid
		end

		-- 直接读取 Vis 自身 PID，避免把临时 shell 当作文件持有者。
		local stat = assert(io.open("/proc/self/stat", "r"))
		pid = tostring(assert(stat:read("*n")))
		stat:close()
		return pid
	end

	local function alive(value)
		local n = tonumber(value)
		return n and os_ok("kill -0 " .. n .. " 2>/dev/null")
	end

	local function read_pid(dir)
		local file = io.open(dir .. "/pid", "r")
		if not file then
			return nil
		end

		local value = file:read("*l")
		file:close()
		return value
	end

	local function lock_dir(path)
		return root .. "/" .. hash(path) .. ".lock"
	end

	local function take(path)
		mkdir_p(root)

		local dir = lock_dir(path)
		if os_ok("mkdir " .. shquote(dir) .. " 2>/dev/null") then
			write_all(dir .. "/pid", current_pid() .. "\n")
			held[path] = dir
			return
		end

		local owner = read_pid(dir)
		if not alive(owner) then
			os.execute("rm -rf " .. shquote(dir))
			if os_ok("mkdir " .. shquote(dir) .. " 2>/dev/null") then
				write_all(dir .. "/pid", current_pid() .. "\n")
				held[path] = dir
			end
			return
		end

		if owner ~= current_pid() then
			vis:message("already open in another terminal\n\n" .. path .. "\npid: " .. tostring(owner))
		end
	end

	local function release(path)
		local dir = held[path]
		if not dir then
			return
		end

		os.execute("rm -rf " .. shquote(dir))
		held[path] = nil
	end

	vis.events.subscribe(vis.events.WIN_OPEN, function(win)
		local path = win and win.file and win.file.path
		if path and not held[path] then
			take(path)
		end
	end)

	vis.events.subscribe(vis.events.FILE_CLOSE, function(file)
		if file and file.path then
			release(file.path)
		end
	end)

	vis.events.subscribe(vis.events.QUIT, function()
		for path in pairs(held) do
			release(path)
		end
	end)
end

-- 状态栏：模式、文件路径、语法、行列和进度。
do
	local mode_names = {
		[vis.modes.INSERT] = "INSERT",
		[vis.modes.NORMAL] = "NORMAL",
		[vis.modes.OPERATOR_PENDING] = "NORMAL",
		[vis.modes.REPLACE] = "REPLACE",
		[vis.modes.VISUAL] = "VISUAL",
		[vis.modes.VISUAL_LINE] = "V-LINE",
	}

	local mode_styles

	local function define_styles()
		if mode_styles then
			return mode_styles
		end

		mode_styles = {
			normal = assert(vis.ui:style_push("fore:#222222,back:#d8d8d8,bold")),
			insert = assert(vis.ui:style_push("fore:#222222,back:#b8e6b8,bold")),
			visual = assert(vis.ui:style_push("fore:#222222,back:#efb1a6,bold")),
			replace = assert(vis.ui:style_push("fore:#222222,back:#f0df9a,bold")),
		}

		return mode_styles
	end

	local function mode_style(styles)
		if vis.mode == vis.modes.INSERT then
			return styles.insert
		end
		if vis.mode == vis.modes.REPLACE then
			return styles.replace
		end
		if vis.mode == vis.modes.VISUAL or vis.mode == vis.modes.VISUAL_LINE then
			return styles.visual
		end
		return styles.normal
	end

	local function percent(win)
		local size = win.file.size or 0
		if size <= 0 then
			return "0%"
		end

		local pos = win.selection and win.selection.pos or 0
		return tostring(math.floor((pos * 100 / size) + 0.5)) .. "%"
	end

	local function draw(win)
		local mode_label = " " .. (mode_names[vis.mode] or "?") .. " "
		local path = win.file.path or win.file.name or ""
		local filename = path ~= "" and home_shorten(path) or "[No Name]"
		if win.file.modified then
			filename = filename .. "+"
		end
		local syntax = win.syntax or "text"
		local line = win.selection and win.selection.line or 1
		local col = win.selection and win.selection.col or 1

		win:status(
			mode_label .. " " .. filename,
			" " .. table.concat({ syntax, tostring(line) .. "," .. tostring(col), percent(win) }, "  ") .. " "
		)

		if win == vis.win then
			local styles = define_styles()
			for x = 0, #mode_label - 1 do
				win:style_pos(mode_style(styles), x, win.height - 1)
			end
		end

		return true
	end

	vis.events.subscribe(vis.events.WIN_STATUS, draw)
end
