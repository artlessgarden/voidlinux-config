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

return M
