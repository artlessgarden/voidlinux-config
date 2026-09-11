# vis 中文状态栏修复

这是独立的 vis 构建辅助工具，不修改个人 vis 配置。
当前版本的 `ui_draw_string` 把中文当作单列字符，导致文件名重叠。
补丁复用 vis 自己的字符解码函数，按实际列宽推进，并处理组合字符和右边界。

## 日常更新

仍然只运行原来的安装脚本：

```sh
sh ~/voidlinux-config/65-vis.sh
```

脚本更新上游源码和依赖后，自动调用这里的 `build.py`：

1. 从上游源码目录创建临时 checkout，原目录保持干净，后续 `git pull` 不受补丁影响。
2. 用真实渲染函数检查中文宽度、重绘、组合字符、边界截断。
3. 若检查已通过，跳过补丁；否则检查补丁兼容性、应用补丁并重测。
4. 编译并运行 vis 的 core、Lua、vis 三组非交互测试。
5. 暂存安装文件，测试全部通过才发布；vis 二进制采用原子替换，旧窗口可以继续运行。

若上游改变了相关接口，测试或补丁可能需要调整；脚本会报错停止，不会强行套用。
这降低了每次更新的工作量，但不承诺补丁永远兼容未来版本。

只重建当前源码、不联网更新和安装系统依赖：

```sh
python3 ~/voidlinux-config/apps/vis-cjk/build.py
```

安装后保存退出并重新打开 vis。构建记录在
`~/.local/share/vis-build/last-build.json`，包含上游提交及是否使用补丁。
上一份二进制保留为 `~/.local/bin/vis.previous`；它只是二进制备份，
不代表同时回滚所有 Lua 运行库文件。

## 文件和检查

- `status-width.patch`：仅修改终端渲染函数。
- `check.py`：编译并测试上游真实函数，使用合成字符串，不访问笔记。
- `build.py`：临时构建、兼容检查、上游测试、暂存发布。
- `test_build.py`：验证自动补丁、跳过、拒绝不兼容变更及原子替换。

```sh
python3 -m unittest discover -s apps/vis-cjk -v
```
