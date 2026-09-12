"""Small daily-use configuration. Existing :set preferences load first."""
config.load_autoconfig()

# QtWebEngine 6.11：启用 Linux OpenGL 视频硬解。
c.qt.args = ["enable-features=AcceleratedVideoDecodeLinuxGL"]

# 会话与界面：保留状态栏，一个标签时隐藏标签栏。
c.auto_save.session = True
c.tabs.show = "multiple"
c.tabs.last_close = "blank"
c.statusbar.show = "always"
c.url.default_page = "about:blank"
c.url.start_pages = ["about:blank"]
c.scrolling.smooth = True

# 播放和输入：进入网页后不自动抢占声音或键盘。
c.content.autoplay = False
c.input.insert_mode.auto_load = False

# 下载完成后收起下载条（不会删除下载文件）。
c.downloads.position = "bottom"
c.downloads.remove_finished = 10000

# 保留现有强制深色偏好；支持网站自身主题时也请求深色。
c.colors.webpage.preferred_color_scheme = "dark"
c.colors.webpage.darkmode.enabled = True

# 广告与跟踪拦截：通用规则、隐私规则、中文网站规则。
c.content.blocking.enabled = True
c.content.blocking.method = "adblock"
c.content.blocking.adblock.lists = [
    "https://easylist.to/easylist/easylist.txt",
    "https://easylist.to/easylist/easyprivacy.txt",
    "https://raw.githubusercontent.com/easylist/easylistchina/master/easylistchina.txt",
]

# 在 :open 后使用 g / b / gh / w 搜索，默认搜索保持原设置。
searches = dict(c.url.searchengines)
searches.update({
    "g": "https://www.google.com/search?q={}",
    "b": "https://search.bilibili.com/all?keyword={}",
    "gh": "https://github.com/search?q={}",
    "w": "https://zh.wikipedia.org/w/index.php?search={}",
})
c.url.searchengines = searches

# 原位翻译方案重新评估中，暂不加载实验模块。

# 普通模式下依次按逗号、字母；原有键位不改。
config.bind(",r", "config-source")
config.bind(",b", "set-cmd-text -s :open b")
config.bind(",h", "open -t qute://history")
config.bind(",m", "spawn mpv {url}")
config.bind(",M", "hint links spawn mpv {hint-url}")
