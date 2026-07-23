require("vis")
local vis = vis

local home = os.getenv("HOME") or "."
local cache = os.getenv("XDG_CACHE_HOME") or (home .. "/.cache")
local state_path = cache .. "/config-theme"
local current = nil

local function trim(value)
  return tostring(value or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function read_file(path)
  local file = io.open(path, "r")
  if not file then return nil end
  local value = trim(file:read("*l") or "")
  file:close()
  return value ~= "" and value or nil
end

local function system_mode()
  local pipe = io.popen("gsettings get org.gnome.desktop.interface color-scheme 2>/dev/null", "r")
  if not pipe then return "dark" end
  local value = pipe:read("*l") or ""
  pipe:close()
  return value:match("prefer%-dark") and "dark" or "light"
end

local function apply()
  local mode = read_file(state_path) or system_mode()
  if mode ~= "dark" then mode = "light" end
  if mode == current then return nil end

  current = mode
  vis:command("set theme " .. (mode == "dark" and "mytheme-dark" or "mytheme"))
  return nil
end

vis.events.subscribe(vis.events.INIT, apply)
vis.events.subscribe(vis.events.WIN_STATUS, apply)
