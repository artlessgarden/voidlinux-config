# 最小可改；:set 写进 autoconfig.yml，由下面加载
config.load_autoconfig()

# 搜索
c.url.searchengines = {
    "DEFAULT": "https://www.google.com/search?q={}",
    "g": "https://www.google.com/search?q={}",
}

# 下载
c.downloads.location.directory = "~/Downloads"
c.downloads.location.prompt = False

# 新标签 / 启动
c.url.start_pages = ["about:blank"]
c.url.default_page = "about:blank"

# 补全
c.completion.show = "always"
c.completion.quick = True
c.completion.use_best_match = True
c.completion.cmd_history_max_items = 500
c.completion.height = "40%"
c.completion.shrink = True
c.completion.open_categories = [
    "history",
    "searchengines",
    "quickmarks",
    "bookmarks",
    "filesystem",
]
# ↑↓ 只在补全列表移动（默认会掺历史）
config.bind("<Up>", "completion-item-focus prev", mode="command")
config.bind("<Down>", "completion-item-focus next", mode="command")

# :adb up 也能补出 adblock-update
# （默认空格后会当成未知命令的参数，补全直接空）
from qutebrowser.completion.completer import Completer as _Completer
from qutebrowser.misc import objects as _objects

_orig_partition = _Completer._partition


def _partition(self):
    before, center, after = _orig_partition(self)
    if before and before[0] not in _objects.commands:
        joined = " ".join([*before, center] if center else before).strip()
        return [], joined, after
    return before, center, after


_Completer._partition = _partition

# normal：离开编辑类模式时切英文键盘（不自动开 rime）
_IME_EN = "spawn -d fcitx5-remote -s keyboard-us"
for _m in ("insert", "command", "caret", "prompt", "yesno", "register"):
    config.bind("<Escape>", f"mode-leave ;; {_IME_EN}", mode=_m)
# hint 取消时清可点标记 + 英文
config.bind(
    "<Escape>",
    (
        "mode-leave ;; "
        "jseval -q -f --world main unmark-clickables.js ;; "
        f"{_IME_EN}"
    ),
    mode="hint",
)

# 去广告（python3-adblock）
c.content.blocking.method = "both"
c.content.blocking.adblock.lists = [
    "https://easylist.to/easylist/easylist.txt",
    "https://easylist.to/easylist/easyprivacy.txt",
    "https://easylist-downloads.adblockplus.org/easylistchina.txt",
    "https://easylist-downloads.adblockplus.org/fanboy-annoyance.txt",
]

# 译文 file:// 页拉原站 CSS/图（,p 用）
c.content.local_content_can_access_remote_urls = True

# 翻译（gtx；有 QUTE_DEEPL_KEY 则 DeepL）
# ,p  离线学习页 → ~/Documents/qute-learn/
# ,e  hint：元素下方实时插译文
# ,y  选区 → 底栏 + 剪贴板
config.bind(",p", "spawn --userscript translate-page")
config.bind(",e", "hint text userscript translate-element")
config.bind(",y", "spawn --userscript translate-inline")
# v  hint 文本块 → caret（取代默认直接进 caret）
config.bind("v", "hint text userscript caret-at-element")
config.bind(";t", "hint inputs")

# f：先标可点（含 cursor:pointer）再用 JS 真点——B 站等 SPA 坐标点击常点到遮罩
config.bind("f", "spawn --userscript hint-js-click")
config.bind("F", "spawn --userscript hint-js-click tab")
config.bind(";b", "spawn --userscript hint-js-click tab-bg")
config.bind(";f", "spawn --userscript hint-js-click tab-fg")
config.bind("wf", "spawn --userscript hint-js-click window")

# 默认只有 asdfghjkl（9 个）；改成 26 字母，hint 更短
c.hints.chars = "abcdefghijklmnopqrstuvwxyz"
c.hints.min_chars = 1
c.hints.scatter = True

# 官方 all 上略增 role / 点击属性（给非 f 的 hint 用；f 走 clickable）
c.hints.selectors["all"] = [
    "a",
    "area",
    "textarea",
    "select",
    'input:not([type="hidden"])',
    "button",
    "frame",
    "iframe",
    "link",
    "summary",
    "details",
    "label",
    '[contenteditable]:not([contenteditable="false"])',
    "[onclick]",
    "[onmousedown]",
    "[onmouseup]",
    "[jsaction]",
    "[data-href]",
    "[data-url]",
    "[data-link]",
    "[ng-click]",
    "[ngClick]",
    "[data-ng-click]",
    "[x-ng-click]",
    '[role="link"]',
    '[role="option"]',
    '[role="button"]',
    '[role="tab"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="treeitem"]',
    '[role="combobox"]',
    '[role="listbox"]',
    '[role="textbox"]',
    '[role="searchbox"]',
    "[aria-haspopup]",
    '[tabindex]:not([tabindex="-1"])',
]
c.hints.selectors["clickable"] = ["[data-qute-cid]"]

# ,e：正文块
c.hints.selectors["text"] = [
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "td",
    "th",
    "blockquote",
    "pre",
    "figcaption",
    "article",
    "section",
    "main",
    "dt",
    "dd",
    "summary",
    "label",
    "a",
    "span",
    "em",
    "strong",
    "small",
    "cite",
    "time",
    "address",
    "div:not(:has(div, p, ul, ol, table, section, article, h1, h2, h3, h4, h5, h6, header, footer, nav))",
]

# 历史：启动时后台清理「超过 N 天未再访问」的 URL（每天最多一次，无 cron）
# 天数可用环境变量 QUTE_HISTORY_DAYS（默认 90）；手动：:spawn --userscript history-prune --force
import subprocess as _sp
import sys as _sys
from pathlib import Path as _Path

_history_prune = _Path(__file__).resolve().parent / "userscripts" / "history-prune"
if _history_prune.is_file():
    _sp.Popen(
        [_sys.executable, str(_history_prune)],
        stdin=_sp.DEVNULL,
        stdout=_sp.DEVNULL,
        stderr=_sp.DEVNULL,
        start_new_session=True,
    )
