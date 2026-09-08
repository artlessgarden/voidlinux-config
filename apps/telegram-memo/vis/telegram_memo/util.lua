local M = {}
function M.shquote(value)
  return "'" .. tostring(value):gsub("'", "'\\''") .. "'"
end
function M.visquote(value)
  return '"' .. tostring(value):gsub('\\', '\\\\'):gsub('"', '\\"') .. '"'
end
return M
