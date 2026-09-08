if os.getenv('TELEGRAM_MEMO_FOLLOW') ~= '1' then return end
local save = require('telegram_memo.autosave')
local util = require('telegram_memo.util')
local pending, positions = nil, {}

local function switch(path)
  if not save.contains(path) or path:find('/%.%./') then return end
  local win = vis.win
  if not win or not win.file then return end
  if win.file.path == path then pending = nil; return end
  pending = path
  if not save.save() then
    vis:info('已暂停切群：保存失败；修复后 :memo-follow 重试')
    return
  end
  if win.file.modified then
    vis:info('已暂停切群：请先保存当前非备注文件')
    return
  end
  if win.file.path then positions[win.file.path] = win.selection.pos end
  vis.mode = vis.modes.NORMAL
  vis:command('e ' .. util.visquote(path))
  if vis.win.file.path == path then
    pending = nil
    vis.win.selection.pos = math.min(positions[path] or 0, vis.win.file.size)
  else vis:info('备注未打开；:memo-follow 重试') end
  vis:redraw()
end

vis.events.subscribe(save.path_event, switch)
vis:command_register('memo-follow', function()
  if pending then switch(pending) end
  return true
end, 'Retry following the selected Telegram chat')
