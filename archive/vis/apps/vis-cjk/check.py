#!/usr/bin/env python3
"""Test real renderer functions against synthetic cells; never opens notes."""
from pathlib import Path
import subprocess
import tempfile

HARNESS = r'''
#define CHECK(x) do { if (!(x)) { fprintf(stderr, "failed: %s\n", #x); return 1; } } while (0)
int main(void) {
    CHECK(setlocale(LC_ALL, "C.UTF-8"));
    VisCellData cells[80] = {0};
    VisCellStyle styles[80] = {0};
    Ui ui = {.width = 80, .height = 1, .style_count = UI_STYLE_MAX,
             .cell_buffer = {.cells = cells, .styles = styles}};
    ui_draw_string(&ui, 0, 0, "我的收藏.txt [saved]", UI_STYLE_DEFAULT);
    CHECK(cells[0].width == 2 && cells[1].data_length == 0);
    CHECK(cells[8].data[0] == '.' && cells[12].data[0] == ' ');
    CHECK(cells[14].data[0] == 's' && cells[19].data[0] == ']');
    ui_draw_string(&ui, 0, 0, "ASCII           ", UI_STYLE_DEFAULT);
    CHECK(cells[1].width == 1 && cells[1].data[0] == 'S');
    ui_draw_string(&ui, 0, 0, "e\xcc\x81X", UI_STYLE_DEFAULT);
    CHECK(cells[0].data_length == 3 && cells[1].data[0] == 'X');
    ui_draw_string(&ui, 78, 0, "好X", UI_STYLE_DEFAULT);
    CHECK(cells[78].width == 2 && cells[79].data_length == 0);
    ui_draw_string(&ui, 79, 0, "好", UI_STYLE_DEFAULT);
    CHECK(cells[79].data_length == 0);
    return 0;
}
'''


def check_renderer(source):
    code = (Path(source) / 'ui-terminal.c').read_text()
    functions = []
    for name in ('vis_cell_from_string', 'vis_cell_style_copy_fg',
                 'vis_cell_style_copy_bg', 'vis_cell_style_merge', 'ui_draw_string'):
        start = code.rfind('VIS_INTERNAL ', 0, code.index('\n' + name + '('))
        if start < 0:
            raise RuntimeError('Vis renderer API changed; review the compatibility test.')
        end = code.index('\n}', start) + 2
        functions.append(code[start:end])
    includes = ('#include "util.h"\n#define TERMKEY_EXPORT static\n'
                '#include "external/termkey.c"\n#include "vis-core.h"\n#include "util.c"\n')
    with tempfile.TemporaryDirectory(prefix='vis-cjk-check-') as tmp:
        path = Path(tmp)
        (path / 'test.c').write_text(includes + '\n'.join(functions) + HARNESS)
        subprocess.run(['cc', '-std=c99', '-ffunction-sections', '-fdata-sections',
                        '-I', str(source), str(path / 'test.c'), '-Wl,--gc-sections',
                        '-o', str(path / 'test')], check=True)
        return subprocess.run([str(path / 'test')], capture_output=True, text=True).returncode == 0


if __name__ == '__main__':
    import sys
    ok = check_renderer(Path(sys.argv[1]).resolve())
    print('PASS: wide-character renderer' if ok else 'FAIL: wide-character renderer')
    sys.exit(0 if ok else 1)
