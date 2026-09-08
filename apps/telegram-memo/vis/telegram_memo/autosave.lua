-- Directory-scoped saving through vis itself; never reads note contents.
local util = require('telegram_memo.util')
local M = { root = os.getenv('TELEGRAM_MEMO_ROOT') or (os.getenv('HOME') .. '/work/memo'),
            path_event = 'Memo::PATH', clock = 0, last_input = -10, errors = {} }
local helper = os.getenv('TELEGRAM_MEMO_HELPER') or (require('telegram_memo').directory .. '/memo.py')
local following = os.getenv('TELEGRAM_MEMO_FOLLOW') == '1'
local process, quitting, busy, started, chunks = nil, false, false, false, ''
local failures = 0

function M.contains(path)
  return path and path:sub(1, #M.root + 1) == M.root .. '/'
end

function M.save()
  local win = vis.win
  if busy or not win or not M.contains(win.file.path) then return true end
  if not win.file.modified then M.errors[win.file.path] = nil; return true end
  local mode, cursors = vis.mode, {}
  for selection in win:selections_iterator() do
    cursors[#cursors + 1] = { selection = selection, pos = selection.pos }
  end
  busy = true
  local ok = pcall(function() vis:command('w') end)
  -- :w goes through Sam, which finishes in NORMAL even when called from Lua.
  -- Restore mode first (mode transitions can move cursors), then positions.
  if vis.win == win then
    vis.mode = mode
    for _, cursor in ipairs(cursors) do cursor.selection.pos = cursor.pos end
  end
  busy = false
  if not ok or win.file.modified then
    M.errors[win.file.path] = '保存失败'
    vis:info('备注保存失败，内容仍在编辑器中；请检查文件权限后 :w')
    return false
  end
  M.errors[win.file.path] = nil
  return true
end

local function start()
  if process or quitting or not started then return end
  if not following and not (vis.win and M.contains(vis.win.file.path)) then return end
  local command = 'exec python3 -u ' .. util.shquote(helper) .. ' --root ' .. util.shquote(M.root)
  if not following then command = command .. ' --clock' end
  if os.getenv('TELEGRAM_MEMO_NO_DOCK') == '1' then command = command .. ' --no-dock' end
  chunks = ''
  process = vis:communicate('memo-helper', command)
  if not process then vis:info('无法启动备注保存计时器') end
end

vis.events.subscribe(vis.events.INPUT, function() M.last_input = M.clock end)
vis.events.subscribe(vis.events.PROCESS_RESPONSE, function(name, kind, _, data)
  if name ~= 'memo-helper' then return end
  if kind == 'STDOUT' then
    chunks = chunks .. data
    while true do
      local ending = chunks:find('\n', 1, true)
      if not ending then break end
      local line = chunks:sub(1, ending - 1)
      chunks = chunks:sub(ending + 1)
      if line:sub(1, 1) == 'T' then
        M.clock = tonumber(line:sub(2)) or M.clock
        local mode = vis.mode
        local safe_mode = mode == vis.modes.NORMAL or mode == vis.modes.INSERT or mode == vis.modes.REPLACE
        if safe_mode and not vis.count and M.clock - M.last_input >= 1 then M.save() end
      elseif line:match('^P[0-9a-f]+$') and (#line - 1) % 2 == 0 then
        local path = line:sub(2):gsub('..', function(pair) return string.char(tonumber(pair, 16)) end)
        vis.events.emit(M.path_event, path)
      end
    end
  elseif kind == 'STDERR' then
    vis:info(data:gsub('\n', ' '))
  elseif kind == 'EXIT' or kind == 'SIGNAL' then
    process = nil
    failures = failures + 1
    if failures <= 3 then start()
    elseif not quitting then vis:info('备注助手异常停止；:memo-restart 可重启') end
  end
end)

vis:command_register('memo-restart', function()
  failures = 0
  start()
  return true
end, 'Restart memo helper if stopped')
vis.events.subscribe(vis.events.FILE_SAVE_POST, function(file)
  if file.path then M.errors[file.path] = nil end
end)
vis.events.subscribe(vis.events.WIN_OPEN, function(win)
  if M.contains(win.file.path) then win.file.savemethod = 'atomic'; start() end
end)
vis.events.subscribe(vis.events.START, function() started = true; start() end)
vis.events.subscribe(vis.events.QUIT, function()
  quitting = true
  if process then vis:close(process); process = nil end
end)
return M
