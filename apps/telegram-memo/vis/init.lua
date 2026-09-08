-- One optional entry point. No dependency on personal my.* modules.
if os.getenv('TELEGRAM_MEMO_DISABLE') == '1' then return end
local config = os.getenv('XDG_CONFIG_HOME')
if not config or config == '' then config = os.getenv('HOME') .. '/.config' end
local enabled = io.open(config .. '/telegram-memo/enabled', 'r')
if not enabled then return end
enabled:close()
if package.loaded['telegram_memo'] then return package.loaded['telegram_memo'] end
require('vis')
local directory = assert(debug.getinfo(1, 'S').source:match('^@(.+)/vis/init%.lua$'))
local plugin = { directory = directory }
package.loaded['telegram_memo'] = plugin
local previous = package.path
package.path = directory .. '/vis/?.lua;' .. previous
local ok, err = pcall(function()
  require('telegram_memo.autosave')
  require('telegram_memo.follow')
end)
package.path = previous
if not ok then error(err) end
return plugin
