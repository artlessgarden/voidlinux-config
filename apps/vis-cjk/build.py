#!/usr/bin/env python3
"""Build and test upstream Vis; the local CJK patch is opt-in."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

from check import check_renderer

HERE = Path(__file__).resolve().parent


def ensure_fix(source):
    if check_renderer(source):
        print('中文渲染检查通过，无需补丁。', flush=True)
        return False
    patch = HERE / 'status-width.patch'
    command = ['git', '-C', str(source), 'apply']
    result = subprocess.run(command + ['--check', str(patch)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError('上游代码与中文补丁不兼容，已停止；现有 vis 未替换。\n' + result.stderr)
    subprocess.run(command + [str(patch)], check=True)
    if not check_renderer(source):
        raise RuntimeError('应用补丁后中文测试仍失败；现有 vis 未替换。')
    print('已在临时构建目录应用中文补丁，渲染检查通过。', flush=True)
    return True


def atomic_copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix='.' + target.name + '-', dir=target.parent)
    os.close(fd)
    staged = Path(name)
    try:
        if source.is_symlink():
            staged.unlink()
            staged.symlink_to(os.readlink(source))
        else:
            shutil.copy2(source, staged)
        os.replace(staged, target)
    finally:
        staged.unlink(missing_ok=True)


def publish(staged, prefix):
    binary = staged / 'bin/vis'
    if not binary.is_file() or binary.is_symlink():
        raise RuntimeError('暂存安装缺少 vis 可执行文件；现有 vis 未替换。')
    files = sorted(path for path in staged.rglob('*') if path.is_file() or path.is_symlink())
    for path in files:
        if path.is_symlink() and (not path.resolve().is_relative_to(staged.resolve())
                                  or not path.is_file()):
            raise RuntimeError('暂存安装出现指向安装范围以外的链接，请检查上游安装布局。')
    # Publish the editor last. Atomic replacement also works while old vis is open.
    for path in files:
        if path != binary:
            atomic_copy(path, prefix / path.relative_to(staged))
    installed = prefix / 'bin/vis'
    if installed.exists():
        atomic_copy(installed, prefix / 'bin/vis.previous')
    atomic_copy(binary, installed)


def build(source, prefix, cjk_patch=False):
    for args in (['diff', '--quiet'], ['diff', '--cached', '--quiet']):
        subprocess.run(['git', '-C', str(source)] + args, check=True)
    revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    with tempfile.TemporaryDirectory(prefix='vis-build-') as tmp:
        work = Path(tmp) / 'source'
        subprocess.run(['git', 'clone', '--quiet', '--local', '--no-hardlinks',
                        '--no-checkout', str(source), str(work)], check=True)
        subprocess.run(['git', '-C', str(work), 'checkout', '--quiet', '--detach', revision], check=True)
        patched = ensure_fix(work) if cjk_patch else False
        subprocess.run(['./configure', '--prefix=' + str(prefix), '--enable-curses=yes',
                        '--enable-lua=yes', '--disable-lpeg-static', '--enable-tre=yes',
                        '--enable-acl=yes'], cwd=work, check=True)
        subprocess.run(['make', '-j2'], cwd=work, check=True)
        for suite in ('core', 'lua', 'vis'):
            subprocess.run(['make', '-C', 'test/' + suite], cwd=work, check=True)
        stage = Path(tmp) / 'install'
        subprocess.run(['make', 'install', 'DESTDIR=' + str(stage)], cwd=work, check=True)
        staged_prefix = stage / prefix.relative_to('/')
        record = staged_prefix / 'share/vis-build/last-build.json'
        record.parent.mkdir(parents=True, exist_ok=True)
        record.write_text(json.dumps({'revision': revision, 'cjk_patch': patched,
                                      'renderer_test': 'passed' if cjk_patch else 'not run', 'suites': ['core', 'lua', 'vis']}, indent=2) + '\n')
        publish(staged_prefix, prefix)
    subprocess.run([str(prefix / 'bin/vis'), '-v'], check=True)
    print('Vis 已安装；重新打开 Vis 即使用新版本。', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path.home() / '.local/src/vis')
    parser.add_argument('--prefix', type=Path, default=Path.home() / '.local')
    parser.add_argument('--cjk-patch', action='store_true', help='enable the local CJK renderer fix')
    args = parser.parse_args()
    try:
        build(args.source.resolve(), args.prefix.resolve(), cjk_patch=args.cjk_patch)
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        parser.exit(1, 'Vis 构建停止：' + str(error) + '\n')
