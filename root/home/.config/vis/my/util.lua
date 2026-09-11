local M = {}

function M.shquote(value)
  return "'" .. tostring(value or ""):gsub("'", "'\\''") .. "'"
end

function M.home_shorten(path)
  local home = os.getenv("HOME")
  if home and (path == home or path:sub(1, #home + 1) == home .. "/") then
    return "~" .. path:sub(#home + 1)
  end
  return path
end

function M.os_ok(command)
  local ok, _, code = os.execute(command)
  return ok == true or ok == 0 or code == 0
end

function M.dirname(path)
  path = tostring(path or "")
  return path:match("^(.+)/[^/]*$") or "."
end

function M.mkdir_p(path)
  if not path or path == "" then return false end
  return M.os_ok("mkdir -p " .. M.shquote(path))
end

function M.write_all(path, data)
  local file = io.open(path, "wb")
  if not file then return false end
  file:write(data or "")
  file:close()
  return true
end

return M
