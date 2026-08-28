// SPDX-FileCopyrightText: © 2026
// SPDX-License-Identifier: 0BSD
//
// tri: left master + right accordion stack for river ≥0.4

const std = @import("std");
const wayland = @import("wayland");
const xkb = @import("xkbcommon");
const c = @import("c");
const titlebar = @import("titlebar.zig");
const input = @import("input.zig");
const config = @import("config.zig");
const river = wayland.client.river;
const wl = wayland.client.wl;
const fatal = std.process.fatal;

const max_shortcut_stack: usize = 10;

const FocusSide = enum { master, stack };

const Output = struct {
    obj: *river.OutputV1,
    removed: bool = false,
    link: wl.list.Link,
    x: i32 = 0,
    y: i32 = 0,
    width: i32 = 0,
    height: i32 = 0,

    fn create(river_output: *river.OutputV1) void {
        const output = wm.gpa.create(Output) catch fatal("Out of memory.", .{});
        output.* = .{ .obj = river_output, .link = undefined };
        output.obj.setListener(*Output, Output.listener, output);
        wm.outputs.append(output);
    }

    fn maybeDestroy(output: *Output) void {
        if (!output.removed) return;
        output.obj.destroy();
        output.link.remove();
        wm.gpa.destroy(output);
    }

    fn listener(_: *river.OutputV1, event: river.OutputV1.Event, output: *Output) void {
        switch (event) {
            .removed => output.removed = true,
            .position => |a| {
                output.x = a.x;
                output.y = a.y;
            },
            .dimensions => |a| {
                output.width = a.width;
                output.height = a.height;
            },
            else => {},
        }
    }
};

const Window = struct {
    obj: *river.WindowV1,
    node: *river.NodeV1,
    link: wl.list.Link,

    new: bool = true,
    closed: bool = false,
    /// Super+Shift+f：informFullscreen 骗 app 全屏，WM 尺寸不变
    hide_chrome: bool = false,
    informed_chrome: bool = false,
    title: []u8 = "",
    app_id: []u8 = "",
    hint_min_w: i32 = 0,
    hint_min_h: i32 = 0,
    hint_max_w: i32 = 0,
    hint_max_h: i32 = 0,
    title_row: bool = false,
    strip: ?titlebar.Chip = null,
    rend_show: bool = false,
    rend_x: i32 = 0,
    rend_y: i32 = 0,

    x: i32 = 0,
    y: i32 = 0,
    width: i32 = 0,
    height: i32 = 0,

    fn listener(_: *river.WindowV1, event: river.WindowV1.Event, window: *Window) void {
        switch (event) {
            .closed => window.closed = true,
            .dimensions => |args| {
                window.width = args.width;
                window.height = args.height;
            },
            .dimensions_hint => |args| {
                window.hint_min_w = args.min_width;
                window.hint_min_h = args.min_height;
                window.hint_max_w = args.max_width;
                window.hint_max_h = args.max_height;
            },
            .title => |args| {
                if (window.title.len != 0) wm.gpa.free(window.title);
                if (args.title) |t| {
                    window.title = wm.gpa.dupe(u8, std.mem.span(t)) catch "";
                } else {
                    window.title = "";
                }
                if (window.title_row) {
                    if (window.strip) |*chip| chip.invalidatePaint(wm.gpa);
                }
            },
            .app_id => |args| {
                if (window.app_id.len != 0) wm.gpa.free(window.app_id);
                if (args.app_id) |a| {
                    window.app_id = wm.gpa.dupe(u8, std.mem.span(a)) catch "";
                } else {
                    window.app_id = "";
                }
            },
            .exit_fullscreen_requested => {},
            .fullscreen_requested => window.obj.informNotFullscreen(),
            else => {},
        }
    }

    fn create(river_window: *river.WindowV1) void {
        const window = wm.gpa.create(Window) catch fatal("Out of memory.", .{});
        window.* = .{
            .obj = river_window,
            .node = river_window.getNode() catch fatal("Unable to obtain Window's Node.", .{}),
            .link = undefined,
        };
        window.obj.setListener(*Window, listener, window);
        wm.windows.append(window);
    }

    fn maybeDestroy(window: *Window) void {
        if (!window.closed) return;

        wm.detachWindow(window);

        if (window.strip) |*s| {
            s.destroy(wm.gpa);
            window.strip = null;
        }
        if (window.title.len != 0) {
            wm.gpa.free(window.title);
            window.title = "";
        }
        if (window.app_id.len != 0) {
            wm.gpa.free(window.app_id);
            window.app_id = "";
        }

        var iter = wm.seats.iterator(.forward);
        while (iter.next()) |seat| {
            if (seat.focused == window) seat.focused = null;
        }

        window.obj.destroy();
        window.link.remove();
        wm.gpa.destroy(window);
    }

    fn manage(window: *Window) void {
        if (window.new) {
            window.new = false;
            window.obj.setCapabilities(.{
                .window_menu = true,
                .maximize = false,
                .fullscreen = false,
                .minimize = false,
            });
            window.obj.informNotFullscreen();
            wm.adoptNew(window);
        }
    }
};

const Action = enum {
    none,
    spawn_term,
    spawn_helium,
    spawn_kbptr,
    spawn_memo,
    screenshot_region,
    screenshot_full,
    brightness_up,
    brightness_down,
    volume_up,
    volume_down,
    volume_mute,
    power_off,
    close,
    focus_toggle,
    expand_next,
    expand_prev,
    swap,
    move_expand_next,
    move_expand_prev,
    fill_screen,
    hide_chrome,
    exit,
    flip_columns,
    toggle_special_0,
    expand_slot_0,
    expand_slot_1,
    expand_slot_2,
    expand_slot_3,
    expand_slot_4,
    expand_slot_5,
    expand_slot_6,
    expand_slot_7,
    expand_slot_8,
    expand_slot_9,
    move_slot_0,
    move_slot_1,
    move_slot_2,
    move_slot_3,
    move_slot_4,
    move_slot_5,
    move_slot_6,
    move_slot_7,
    move_slot_8,
    move_slot_9,

    /// 会新开平铺窗、占栈槽的快捷键。
    fn needsTiledSlot(self: Action) bool {
        return switch (self) {
            .spawn_term, .spawn_helium, .spawn_kbptr, .spawn_memo,
            .screenshot_region, .screenshot_full => true,
            else => false,
        };
    }
};

fn spawnArgv(argv: []const []const u8) void {
    _ = std.process.spawn(wm.io, .{ .argv = argv }) catch |err| {
        std.log.err("spawn {s}: {}", .{ argv[0], err });
    };
}

fn spawnSh(cmd: []const u8) void {
    spawnArgv(&.{ "sh", "-c", cmd });
}

/// 快捷键 spawn 上限；外部打开的窗口不受此限。
fn canSpawnFromShortcut(window_manager: *const WindowManager) bool {
    if (window_manager.master == null and window_manager.stack.items.len == 0) return true;
    if (window_manager.stack.items.len == 0) return true;
    return window_manager.stack.items.len < max_shortcut_stack;
}

fn logShortcutStackFull() void {
    std.log.warn("shortcut stack full ({d}), not spawning", .{max_shortcut_stack});
}

fn slotFromExpandAction(action: Action) ?usize {
    const base = @intFromEnum(Action.expand_slot_0);
    const v = @intFromEnum(action);
    if (v < base or v > @intFromEnum(Action.expand_slot_9)) return null;
    return v - base;
}

fn slotFromMoveAction(action: Action) ?usize {
    const base = @intFromEnum(Action.move_slot_0);
    const v = @intFromEnum(action);
    if (v < base or v > @intFromEnum(Action.move_slot_9)) return null;
    return v - base;
}

const XkbBinding = struct {
    obj: *river.XkbBindingV1,
    seat: *Seat,
    action: Action = .none,
    link: wl.list.Link,

    fn listener(_: *river.XkbBindingV1, event: river.XkbBindingV1.Event, binding: *XkbBinding) void {
        switch (event) {
            .pressed => binding.seat.pending_action = binding.action,
            else => {},
        }
    }

    fn create(seat: *Seat, mods: river.SeatV1.Modifiers, keysym: xkb.Keysym, action: Action) void {
        const binding = wm.gpa.create(XkbBinding) catch fatal("Out of memory.", .{});
        const obj = wm.xkb_bindings.getXkbBinding(seat.obj, @intFromEnum(keysym), mods) catch fatal("Out of memory.", .{});
        binding.* = .{
            .obj = obj,
            .seat = seat,
            .action = action,
            .link = undefined,
        };
        seat.xkb_bindings.append(binding);
        binding.obj.setListener(*XkbBinding, listener, binding);
        binding.obj.enable();
    }

    fn destroy(binding: *XkbBinding) void {
        binding.obj.destroy();
        binding.link.remove();
        wm.gpa.destroy(binding);
    }
};

const Seat = struct {
    obj: *river.SeatV1,
    new: bool = true,
    removed: bool = false,
    link: wl.list.Link,

    focused: ?*Window = null,
    interacted: ?*Window = null,
    shell_pressed: ?*river.ShellSurfaceV1 = null,

    xkb_bindings: wl.list.Head(XkbBinding, .link),
    pending_action: Action = .none,

    fn listener(_: *river.SeatV1, event: river.SeatV1.Event, seat: *Seat) void {
        switch (event) {
            .removed => seat.removed = true,
            .window_interaction => |args| seat.interacted = if (args.window) |w|
                @ptrCast(@alignCast(w.getUserData()))
            else
                null,
            .shell_surface_interaction => |args| {
                seat.shell_pressed = args.shell_surface;
            },
            else => {},
        }
    }

    fn create(river_seat: *river.SeatV1) void {
        const seat = wm.gpa.create(Seat) catch fatal("Out of memory.", .{});
        seat.* = .{
            .obj = river_seat,
            .link = undefined,
            .xkb_bindings = undefined,
        };
        seat.xkb_bindings.init();
        seat.obj.setListener(*Seat, listener, seat);
        wm.seats.append(seat);
    }

    fn maybeDestroy(seat: *Seat) void {
        if (!seat.removed) return;
        while (seat.xkb_bindings.first()) |binding| binding.destroy();
        seat.obj.destroy();
        seat.link.remove();
        wm.gpa.destroy(seat);
    }

    fn focusWindow(seat: *Seat, window: ?*Window) void {
        if (window) |w| {
            seat.obj.focusWindow(w.obj);
        } else {
            seat.obj.clearFocus();
        }
        seat.focused = window;
    }

    fn syncFocusFromLayout(seat: *Seat) void {
        const target: ?*Window = switch (wm.focus_side) {
            .master => wm.master,
            .stack => if (wm.stack.items.len > 0) wm.stack.items[wm.expanded] else wm.master,
        };
        seat.focusWindow(target);
    }

    fn handleAction(seat: *Seat, action: Action) void {
        if (action.needsTiledSlot() and !canSpawnFromShortcut(&wm)) {
            logShortcutStackFull();
            return;
        }
        switch (action) {
            .none => {},
            .spawn_term => spawnArgv(&.{cfg.term}),
            .spawn_helium => spawnArgv(&.{cfg.browser}),
            .spawn_kbptr => spawnArgv(&.{
                "wl-kbptr",
                "-o",
                "modes=floating,click",
                "-o",
                "mode_floating.source=detect",
            }),
            .spawn_memo => spawnArgv(&.{ cfg.term, "-e", "vis", cfg.memo_path }),
            .screenshot_region => spawnSh(
                \\grim -g "$(slurp)" - | satty -f - --copy-command wl-copy --early-exit copy
            ),
            .screenshot_full => spawnSh(
                \\grim - | satty -f - --copy-command wl-copy --early-exit copy
            ),
            .brightness_up => spawnArgv(&.{ "brightnessctl", "set", "2%+" }),
            .brightness_down => spawnArgv(&.{ "brightnessctl", "set", "2%-" }),
            .volume_up => spawnArgv(&.{ "wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", "2%+" }),
            .volume_down => spawnArgv(&.{ "wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", "2%-" }),
            .volume_mute => spawnArgv(&.{ "wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle" }),
            .power_off => spawnArgv(&.{ "wlopm", "--toggle", "*" }),
            .close => {
                if (seat.focused) |window| window.obj.close();
            },
            .focus_toggle => wm.focusToggle(),
            .expand_next => wm.expandBy(1),
            .expand_prev => wm.expandBy(-1),
            .swap => wm.swapMasterStack(seat),
            .move_expand_next => wm.moveSubjectBy(seat, 1),
            .move_expand_prev => wm.moveSubjectBy(seat, -1),
            .fill_screen => wm.toggleMonocle(),
            .hide_chrome => if (seat.focused) |w| {
                w.hide_chrome = !w.hide_chrome;
            },
            .exit => wm.obj.exitSession(),
            .flip_columns => wm.toggleFlipColumns(),
            .toggle_special_0 => wm.toggleSpecial0(),
            .expand_slot_0, .expand_slot_1, .expand_slot_2, .expand_slot_3, .expand_slot_4, .expand_slot_5, .expand_slot_6, .expand_slot_7, .expand_slot_8, .expand_slot_9 => {
                if (slotFromExpandAction(action)) |slot| wm.expandToSlot(slot);
            },
            .move_slot_0, .move_slot_1, .move_slot_2, .move_slot_3, .move_slot_4, .move_slot_5, .move_slot_6, .move_slot_7, .move_slot_8, .move_slot_9 => {
                if (slotFromMoveAction(action)) |slot| wm.moveSubjectToSlot(seat, slot);
            },
        }
    }

    fn manage(seat: *Seat) void {
        if (seat.new) {
            seat.new = false;
            seat.obj.setXcursorTheme(cfg.cursor_theme, cfg.cursor_size);
            const super: river.SeatV1.Modifiers = .{ .mod4 = true };
            const super_shift: river.SeatV1.Modifiers = .{ .mod4 = true, .shift = true };
            const none: river.SeatV1.Modifiers = .{};

            XkbBinding.create(seat, super, .Return, .spawn_term);
            XkbBinding.create(seat, super, .a, .spawn_term);
            XkbBinding.create(seat, super, .c, .spawn_helium);
            XkbBinding.create(seat, super, .w, .spawn_kbptr);
            XkbBinding.create(seat, super, .n, .spawn_memo);
            XkbBinding.create(seat, super, .p, .screenshot_region);
            XkbBinding.create(seat, super_shift, .p, .screenshot_full);
            XkbBinding.create(seat, super, .Escape, .power_off);
            XkbBinding.create(seat, super_shift, .Escape, .exit);

            XkbBinding.create(seat, none, .XF86MonBrightnessUp, .brightness_up);
            XkbBinding.create(seat, none, .XF86MonBrightnessDown, .brightness_down);
            XkbBinding.create(seat, none, .XF86AudioRaiseVolume, .volume_up);
            XkbBinding.create(seat, none, .XF86AudioLowerVolume, .volume_down);
            XkbBinding.create(seat, none, .XF86AudioMute, .volume_mute);

            XkbBinding.create(seat, super, .q, .close);
            XkbBinding.create(seat, super, .s, .focus_toggle);
            XkbBinding.create(seat, super, .e, .expand_prev);
            XkbBinding.create(seat, super, .d, .expand_next);
            XkbBinding.create(seat, super_shift, .s, .swap);
            XkbBinding.create(seat, super_shift, .e, .move_expand_prev);
            XkbBinding.create(seat, super_shift, .d, .move_expand_next);
            XkbBinding.create(seat, super, .f, .fill_screen);
            XkbBinding.create(seat, super_shift, .f, .hide_chrome);
            XkbBinding.create(seat, super_shift, .r, .flip_columns);
            XkbBinding.create(seat, super, .apostrophe, .toggle_special_0);

            const slot_keys = [_]xkb.Keysym{
                .@"0", .@"1", .@"2", .@"3", .@"4", .@"5", .@"6", .@"7", .@"8", .@"9",
            };
            const expand_slots = [_]Action{
                .expand_slot_0, .expand_slot_1, .expand_slot_2, .expand_slot_3, .expand_slot_4,
                .expand_slot_5, .expand_slot_6, .expand_slot_7, .expand_slot_8, .expand_slot_9,
            };
            const move_slots = [_]Action{
                .move_slot_0, .move_slot_1, .move_slot_2, .move_slot_3, .move_slot_4,
                .move_slot_5, .move_slot_6, .move_slot_7, .move_slot_8, .move_slot_9,
            };
            for (slot_keys, expand_slots, move_slots) |ksym, exp, mov| {
                XkbBinding.create(seat, super, ksym, exp);
                XkbBinding.create(seat, super_shift, ksym, mov);
            }
        }

        seat.handleAction(seat.pending_action);
        seat.pending_action = .none;

        if (seat.shell_pressed) |shell| {
            if (wm.stackIndexForShell(shell)) |idx| wm.focusStackIndex(idx);
            seat.shell_pressed = null;
        }

        if (seat.interacted) |w| {
            wm.focusClicked(w);
            seat.interacted = null;
        }

        seat.syncFocusFromLayout();
    }
};

const WindowManager = struct {
    gpa: std.mem.Allocator,
    io: std.Io,

    obj: *river.WindowManagerV1,
    xkb_bindings: *river.XkbBindingsV1,

    outputs: wl.list.Head(Output, .link),
    windows: wl.list.Head(Window, .link),
    seats: wl.list.Head(Seat, .link),

    master: ?*Window = null,
    stack: std.ArrayListUnmanaged(*Window) = .empty,
    expanded: usize = 0,
    focus_side: FocusSide = .master,
    stack_on_left: bool = false,
    monocle: bool = false,
    /// Super+'：0 槽「高 chip」模式（stack_len≥2 时有效）
    special_0: bool = false,

    fn primaryOutput(window_manager: *WindowManager) ?*Output {
        var it = window_manager.outputs.iterator(.forward);
        while (it.next()) |o| {
            if (o.width > 0 and o.height > 0) return o;
        }
        return null;
    }

    fn toggleMonocle(window_manager: *WindowManager) void {
        window_manager.monocle = !window_manager.monocle;
    }

    fn monocleActive(window_manager: *WindowManager) bool {
        return window_manager.monocle;
    }

    fn monocleWindow(window_manager: *WindowManager) ?*Window {
        return focusedTiled(window_manager);
    }

    fn raiseLayers(window_manager: *WindowManager) void {
        if (monocleActive(window_manager)) {
            if (monocleWindow(window_manager)) |w| w.node.placeTop();
            return;
        }
        if (special0Active(window_manager)) {
            const z0 = window_manager.stack.items[0];
            if (!z0.title_row) z0.node.placeTop();
        }
        if (window_manager.stack.items.len > 0) {
            const exp = window_manager.stack.items[window_manager.expanded];
            if (!exp.title_row and !(special0Active(window_manager) and window_manager.expanded == 0)) {
                exp.node.placeTop();
            }
        }
        var si: usize = 0;
        while (si < window_manager.stack.items.len) : (si += 1) {
            const w = window_manager.stack.items[si];
            if (!w.title_row) continue;
            if (w.strip) |*chip| chip.node.placeTop();
        }
    }

    fn syncHideChrome(window: *Window) void {
        if (window.hide_chrome and !window.informed_chrome) {
            window.obj.informFullscreen();
            window.informed_chrome = true;
        } else if (!window.hide_chrome and window.informed_chrome) {
            window.obj.informNotFullscreen();
            window.informed_chrome = false;
        }
    }

    fn icontains(hay: []const u8, needle: []const u8) bool {
        if (needle.len == 0 or hay.len < needle.len) return false;
        var i: usize = 0;
        while (i + needle.len <= hay.len) : (i += 1) {
            if (std.ascii.eqlIgnoreCase(hay[i..][0..needle.len], needle)) return true;
        }
        return false;
    }

    fn classifyWindow(window: *Window) titlebar.ChipKind {
        if (icontains(window.app_id, "alacritty")) return .shell;
        if (icontains(window.app_id, "helium")) return .browser;
        if (icontains(window.app_id, "mpv") or
            icontains(window.app_id, "imv") or
            icontains(window.app_id, "zathura"))
            return .viewer;
        return .other;
    }

    fn chipTitle(buf: []u8, w: *Window) []const u8 {
        const raw = if (w.title.len != 0) w.title else "";
        if (raw.len == 0) return "…";
        return truncateLabel(buf, raw);
    }

    fn syncSpecial0(window_manager: *WindowManager) void {
        if (window_manager.stack.items.len < 2) window_manager.special_0 = false;
    }

    fn special0Active(window_manager: *WindowManager) bool {
        return window_manager.special_0 and window_manager.stack.items.len >= 2;
    }

    fn toggleSpecial0(window_manager: *WindowManager) void {
        window_manager.syncSpecial0();
        if (window_manager.stack.items.len < 2) return;
        window_manager.special_0 = !window_manager.special_0;
    }

    fn layoutStackRow(
        window_manager: *WindowManager,
        sx: i32,
        y: *i32,
        sw: i32,
        chip_h: i32,
        expand_h: i32,
        start: usize,
    ) void {
        var i = start;
        while (i < window_manager.stack.items.len) : (i += 1) {
            const w = window_manager.stack.items[i];
            w.obj.useSsd();
            if (i == window_manager.expanded) {
                const was_row = w.title_row;
                clearTitle(w);
                if (was_row or w.width != sw or w.height != expand_h) {
                    w.obj.proposeDimensions(sw, expand_h);
                }
                planShow(w, sx, y.*);
                y.* += expand_h;
            } else {
                const was_row = w.title_row;
                if (!was_row) w.obj.proposeDimensions(sw, chip_h);
                planHide(w);
                w.title_row = true;
                if (w.strip == null) {
                    w.strip = titlebar.Chip.create() catch null;
                }
                if (w.strip) |*chip| {
                    var title_buf: [120]u8 = undefined;
                    const title = chipTitle(&title_buf, w);
                    chip.setChip(window_manager.gpa, i, title, classifyWindow(w));
                    chip.layout(sx, y.*, sw, chip_h);
                }
                y.* += chip_h;
            }
        }
    }

    fn noBorder(window: *Window) void {
        const e: river.WindowV1.Edges = .{
            .top = true,
            .bottom = true,
            .left = true,
            .right = true,
        };
        window.obj.setBorders(e, 0, 0, 0, 0, 0);
    }

    fn truncateLabel(buf: []u8, text: []const u8) []const u8 {
        if (text.len <= buf.len) return text;
        var view = std.unicode.Utf8View.init(text) catch return "…";
        var it = view.iterator();
        var len: usize = 0;
        while (it.nextCodepoint()) |cp| {
            var enc: [4]u8 = undefined;
            const n = std.unicode.utf8Encode(cp, &enc) catch break;
            if (len + n + 1 > buf.len) break;
            @memcpy(buf[len..][0..n], enc[0..n]);
            len += n;
        }
        if (len == 0) return "…";
        buf[len] = '~';
        return buf[0 .. len + 1];
    }

    fn focusedTiled(window_manager: *WindowManager) ?*Window {
        return switch (window_manager.focus_side) {
            .master => window_manager.master,
            .stack => if (window_manager.stack.items.len > 0)
                window_manager.stack.items[window_manager.expanded]
            else
                window_manager.master,
        };
    }

    fn stackIndexOf(window_manager: *WindowManager, window: *Window) ?usize {
        var i: usize = 0;
        while (i < window_manager.stack.items.len) : (i += 1) {
            if (window_manager.stack.items[i] == window) return i;
        }
        return null;
    }

    fn focusFollowWindow(window_manager: *WindowManager, win: ?*Window) void {
        const w = win orelse return;
        if (window_manager.master == w) {
            window_manager.focus_side = .master;
            return;
        }
        if (stackIndexOf(window_manager, w)) |idx| {
            window_manager.expanded = idx;
            window_manager.focus_side = .stack;
        }
    }

    fn moveSubject(window_manager: *WindowManager, seat: *Seat) ?*Window {
        return switch (window_manager.focus_side) {
            .master => if (window_manager.stack.items.len > 0)
                window_manager.stack.items[window_manager.expanded]
            else
                null,
            .stack => seat.focused,
        };
    }

    fn stackMoveIndex(window_manager: *WindowManager, from: usize, to: usize) void {
        if (from >= window_manager.stack.items.len or to >= window_manager.stack.items.len or from == to) return;
        const w = window_manager.stack.items[from];
        const exp = window_manager.expanded;

        if (from < to) {
            var i = from;
            while (i < to) : (i += 1) {
                window_manager.stack.items[i] = window_manager.stack.items[i + 1];
            }
            window_manager.stack.items[to] = w;
        } else {
            var i = from;
            while (i > to) : (i -= 1) {
                window_manager.stack.items[i] = window_manager.stack.items[i - 1];
            }
            window_manager.stack.items[to] = w;
        }

        var new_exp = exp;
        if (exp == from) {
            new_exp = to;
        } else if (from < exp and to >= exp) {
            new_exp = exp - 1;
        } else if (from > exp and to <= exp) {
            new_exp = exp + 1;
        }
        window_manager.expanded = new_exp;
    }

    fn moveSubjectBy(window_manager: *WindowManager, seat: *Seat, delta: i32) void {
        const w = moveSubject(window_manager, seat) orelse return;
        const from = stackIndexOf(window_manager, w) orelse return;
        const to: isize = @as(isize, @intCast(from)) + delta;
        if (to < 0 or to >= window_manager.stack.items.len) return;
        stackMoveIndex(window_manager, from, @intCast(to));
        if (window_manager.focus_side == .stack) focusFollowWindow(window_manager, w);
    }

    fn moveSubjectToSlot(window_manager: *WindowManager, seat: *Seat, slot: usize) void {
        const w = moveSubject(window_manager, seat) orelse return;
        const from = stackIndexOf(window_manager, w) orelse return;
        if (slot >= window_manager.stack.items.len) return;
        stackMoveIndex(window_manager, from, slot);
        if (window_manager.focus_side == .stack) focusFollowWindow(window_manager, w);
    }

    fn hideOthersForFill(window_manager: *WindowManager, keep: *Window) void {
        if (window_manager.master) |m| clearTitle(m);
        var ti: usize = 0;
        while (ti < window_manager.stack.items.len) : (ti += 1) {
            clearTitle(window_manager.stack.items[ti]);
        }
        var wit = window_manager.windows.iterator(.forward);
        while (wit.next()) |w| {
            if (w == keep) continue;
            planHide(w);
        }
    }

    fn adoptNew(window_manager: *WindowManager, window: *Window) void {
        if (window_manager.master == null and window_manager.stack.items.len == 0) {
            window_manager.master = window;
            window_manager.focus_side = .master;
            return;
        }

        if (window_manager.stack.items.len == 0) {
            window_manager.stackAppend(window) catch fatal("Out of memory.", .{});
            window_manager.expanded = 0;
            window_manager.focus_side = .stack;
            return;
        }

        const ins = window_manager.expanded + 1;
        if (ins >= window_manager.stack.items.len) {
            window_manager.stackAppend(window) catch fatal("Out of memory.", .{});
            window_manager.expanded = window_manager.stack.items.len - 1;
        } else {
            window_manager.stackInsert(ins, window) catch fatal("Out of memory.", .{});
            window_manager.expanded = ins;
        }
        window_manager.focus_side = .stack;
    }

    fn stackAppend(window_manager: *WindowManager, window: *Window) !void {
        try window_manager.stack.append(window_manager.gpa, window);
    }

    fn stackInsert(window_manager: *WindowManager, index: usize, window: *Window) !void {
        const i = @min(index, window_manager.stack.items.len);
        try window_manager.stack.insert(window_manager.gpa, i, window);
    }

    fn stackRemoveAt(window_manager: *WindowManager, index: usize) *Window {
        return window_manager.stack.orderedRemove(index);
    }

    fn fixExpandedAfterRemove(window_manager: *WindowManager, index: usize) void {
        if (window_manager.stack.items.len == 0) {
            window_manager.expanded = 0;
            return;
        }
        if (index < window_manager.stack.items.len) {
            window_manager.expanded = index;
        } else {
            window_manager.expanded = window_manager.stack.items.len - 1;
        }
    }

    fn detachWindow(window_manager: *WindowManager, window: *Window) void {
        if (window_manager.master == window) {
            if (window_manager.stack.items.len == 0) {
                window_manager.master = null;
                window_manager.focus_side = .master;
                return;
            }
            const promoted = window_manager.stackRemoveAt(window_manager.expanded);
            window_manager.fixExpandedAfterRemove(window_manager.expanded);
            window_manager.master = promoted;
            window_manager.focus_side = .master;
            return;
        }

        var i: usize = 0;
        while (i < window_manager.stack.items.len) : (i += 1) {
            if (window_manager.stack.items[i] == window) {
                const was_expanded = (i == window_manager.expanded);
                _ = window_manager.stackRemoveAt(i);
                if (was_expanded) {
                    window_manager.fixExpandedAfterRemove(i);
                } else if (window_manager.expanded > i) {
                    window_manager.expanded -= 1;
                }
                if (window_manager.stack.items.len == 0) {
                    window_manager.focus_side = .master;
                }
                return;
            }
        }
    }

    fn focusToggle(window_manager: *WindowManager) void {
        if (window_manager.stack.items.len == 0) {
            window_manager.focus_side = .master;
            return;
        }
        window_manager.focus_side = if (window_manager.focus_side == .master) .stack else .master;
    }

    fn expandBy(window_manager: *WindowManager, delta: i32) void {
        if (window_manager.stack.items.len < 2) return;
        const j: isize = @as(isize, @intCast(window_manager.expanded)) + delta;
        if (j < 0 or j >= window_manager.stack.items.len) return;
        window_manager.expanded = @intCast(j);
    }

    fn expandToSlot(window_manager: *WindowManager, slot: usize) void {
        if (slot >= window_manager.stack.items.len) return;
        window_manager.expanded = slot;
    }

    fn focusClicked(window_manager: *WindowManager, window: *Window) void {
        if (window_manager.master == window) {
            window_manager.focus_side = .master;
            return;
        }
        if (stackIndexOf(window_manager, window)) |idx| {
            window_manager.expanded = idx;
            window_manager.focus_side = .stack;
        }
    }

    fn swapMasterStack(window_manager: *WindowManager, seat: *Seat) void {
        if (window_manager.master == null or window_manager.stack.items.len == 0) return;
        const keep = seat.focused;
        const stack_idx = switch (window_manager.focus_side) {
            .master => window_manager.expanded,
            .stack => stackIndexOf(window_manager, seat.focused orelse return) orelse return,
        };
        const m = window_manager.master.?;
        const s = window_manager.stack.items[stack_idx];
        window_manager.master = s;
        window_manager.stack.items[stack_idx] = m;
        focusFollowWindow(window_manager, keep);
    }

    fn focusStackIndex(window_manager: *WindowManager, index: usize) void {
        if (index >= window_manager.stack.items.len) return;
        window_manager.expanded = index;
        window_manager.focus_side = .stack;
    }

    fn stackIndexForShell(window_manager: *WindowManager, shell: *river.ShellSurfaceV1) ?usize {
        var i: usize = 0;
        while (i < window_manager.stack.items.len) : (i += 1) {
            if (window_manager.stack.items[i].strip) |*chip| {
                if (chip.shell == shell) return i;
            }
        }
        return null;
    }

    fn clearTitle(window: *Window) void {
        window.title_row = false;
        if (window.strip) |*s| {
            s.destroy(wm.gpa);
            window.strip = null;
        }
    }

    fn planShow(window: *Window, x: i32, y: i32) void {
        window.rend_show = true;
        window.rend_x = x;
        window.rend_y = y;
    }

    fn planHide(window: *Window) void {
        window.rend_show = false;
    }

    fn applyRenderShow(window: *Window) void {
        window.obj.show();
        window.node.setPosition(window.rend_x, window.rend_y);
        window.x = window.rend_x;
        window.y = window.rend_y;
    }

    fn layoutRender(window_manager: *WindowManager) void {
        var wit = window_manager.windows.iterator(.forward);
        while (wit.next()) |w| {
            if (!w.rend_show) w.obj.hide();
        }
        wit = window_manager.windows.iterator(.forward);
        while (wit.next()) |w| {
            if (w.rend_show) applyRenderShow(w);
        }
    }

    fn mwSize(ow: i32) i32 {
        return @intFromFloat(@as(f32, @floatFromInt(ow)) * cfg.master_ratio);
    }

    fn masterColumnX(ox: i32, ow: i32, stack_on_left: bool) i32 {
        if (stack_on_left) return ox + ow - mwSize(ow);
        return ox;
    }

    fn stackColumnX(ox: i32, ow: i32, stack_on_left: bool) i32 {
        if (stack_on_left) return ox;
        return ox + mwSize(ow);
    }

    fn toggleFlipColumns(window_manager: *WindowManager) void {
        window_manager.stack_on_left = !window_manager.stack_on_left;
    }

    fn layoutManage(window_manager: *WindowManager) void {
        const output = window_manager.primaryOutput() orelse return;
        const ox = output.x;
        const oy = output.y;
        const ow = output.width;
        const oh = output.height;

        var wit = window_manager.windows.iterator(.forward);
        while (wit.next()) |w| planHide(w);

        if (monocleActive(window_manager)) {
            if (monocleWindow(window_manager)) |w| {
                hideOthersForFill(window_manager, w);
                w.obj.useSsd();
                w.obj.proposeDimensions(ow, oh);
                planShow(w, ox, oy);
            }
            wit = window_manager.windows.iterator(.forward);
            while (wit.next()) |w| syncHideChrome(w);
            return;
        }

        if (window_manager.master) |m| {
            m.obj.useSsd();
            clearTitle(m);

            if (window_manager.stack.items.len == 0) {
                m.obj.proposeDimensions(ow, oh);
                planShow(m, ox, oy);
                wit = window_manager.windows.iterator(.forward);
                while (wit.next()) |w| syncHideChrome(w);
                return;
            }

            const mw = mwSize(ow);
            const sw = ow - mw;
            const mx = masterColumnX(ox, ow, window_manager.stack_on_left);
            const sx = stackColumnX(ox, ow, window_manager.stack_on_left);
            m.obj.proposeDimensions(mw, oh);
            planShow(m, mx, oy);

            const chip_h = titlebar.chipHeight();
            titlebar.stack_on_left = window_manager.stack_on_left;
            window_manager.syncSpecial0();

            var y: i32 = oy;

            if (special0Active(window_manager)) {
                const slot0_full = window_manager.expanded == 0;
                const zero_h: i32 = if (slot0_full) blk: {
                    const chips_below: i32 = @intCast(window_manager.stack.items.len - 1);
                    var h = oh - chips_below * chip_h;
                    if (h < chip_h) h = chip_h;
                    break :blk h;
                } else @intFromFloat(@as(f32, @floatFromInt(oh)) * cfg.slot0_ratio);

                const accordion_oh = oh - zero_h;
                const w0 = window_manager.stack.items[0];
                w0.obj.useSsd();
                clearTitle(w0);
                if (w0.width != sw or w0.height != zero_h) {
                    w0.obj.proposeDimensions(sw, zero_h);
                }
                planShow(w0, sx, oy);
                y = oy + zero_h;

                const accordion_n = window_manager.stack.items.len - 1;
                const accordion_chips: i32 = if (window_manager.expanded >= 1)
                    @intCast(accordion_n - 1)
                else
                    @intCast(accordion_n);
                var expand_h = accordion_oh - accordion_chips * chip_h;
                if (expand_h < chip_h) expand_h = chip_h;

                layoutStackRow(window_manager, sx, &y, sw, chip_h, expand_h, 1);
            } else {
                const collapsed: i32 = @intCast(window_manager.stack.items.len - 1);
                var expand_h = oh - collapsed * chip_h;
                if (expand_h < chip_h) expand_h = chip_h;
                layoutStackRow(window_manager, sx, &y, sw, chip_h, expand_h, 0);
            }
        } else if (window_manager.stack.items.len > 0) {
            window_manager.master = window_manager.stackRemoveAt(0);
            window_manager.fixExpandedAfterRemove(0);
            window_manager.layoutManage();
            return;
        }

        wit = window_manager.windows.iterator(.forward);
        while (wit.next()) |w| syncHideChrome(w);
    }

    fn manageStart(window_manager: *WindowManager) void {
        var windows_iter = window_manager.windows.iterator(.forward);
        var outputs_iter = window_manager.outputs.iterator(.forward);
        var seats_iter = window_manager.seats.iterator(.forward);
        while (windows_iter.next()) |window| window.maybeDestroy();
        while (outputs_iter.next()) |output| output.maybeDestroy();
        while (seats_iter.next()) |seat| seat.maybeDestroy();

        seats_iter = window_manager.seats.iterator(.forward);
        windows_iter = window_manager.windows.iterator(.forward);
        while (seats_iter.next()) |seat| seat.manage();
        while (windows_iter.next()) |window| window.manage();

        window_manager.layoutManage();
        window_manager.obj.manageFinish();
    }

    fn renderStart(window_manager: *WindowManager) void {
        window_manager.layoutRender();

        var wit = window_manager.windows.iterator(.forward);
        while (wit.next()) |w| noBorder(w);

        const hide_chips = monocleActive(window_manager);

        if (!hide_chips) {
            var i: usize = 0;
            while (i < window_manager.stack.items.len) : (i += 1) {
                const w = window_manager.stack.items[i];
                if (!w.title_row) continue;
                if (w.strip) |*chip| chip.render(window_manager.gpa);
            }
        }

        window_manager.raiseLayers();

        window_manager.obj.renderFinish();
    }

    fn listener(_: *river.WindowManagerV1, event: river.WindowManagerV1.Event, _: ?*anyopaque) void {
        switch (event) {
            .unavailable => fatal("Another window manager is already running.", .{}),
            .finished => std.process.exit(0),
            .manage_start => wm.manageStart(),
            .render_start => wm.renderStart(),
            .window => |ev| Window.create(ev.id),
            .output => |ev| Output.create(ev.id),
            .seat => |ev| Seat.create(ev.id),
            else => {},
        }
    }
};

const Globals = struct {
    river_window_manager_v1: ?*river.WindowManagerV1 = null,
    river_xkb_bindings_v1: ?*river.XkbBindingsV1 = null,
    wl_compositor: ?*wl.Compositor = null,
    wl_shm: ?*wl.Shm = null,
};

fn registryListener(
    registry: *wl.Registry,
    event: wl.Registry.Event,
    globals: *Globals,
) void {
    switch (event) {
        .global => |ev| {
            if (std.mem.orderZ(u8, river.WindowManagerV1.interface.name, ev.interface) == .eq) {
                if (ev.version < 4) fatal("Expected river wm version to be a least 4.", .{});
                const river_wm = registry.bind(ev.name, river.WindowManagerV1, 4) catch
                    fatal("Out of memory.", .{});
                globals.river_window_manager_v1 = river_wm;
                river_wm.setListener(?*anyopaque, WindowManager.listener, null);
            } else if (std.mem.orderZ(u8, river.XkbBindingsV1.interface.name, ev.interface) == .eq) {
                globals.river_xkb_bindings_v1 = registry.bind(ev.name, river.XkbBindingsV1, 3) catch
                    fatal("Out of memory.", .{});
            } else if (std.mem.orderZ(u8, wl.Compositor.interface.name, ev.interface) == .eq) {
                globals.wl_compositor = registry.bind(ev.name, wl.Compositor, 4) catch
                    fatal("Out of memory.", .{});
            } else if (std.mem.orderZ(u8, wl.Shm.interface.name, ev.interface) == .eq) {
                globals.wl_shm = registry.bind(ev.name, wl.Shm, 1) catch
                    fatal("Out of memory.", .{});
            } else {
                input.bindFromRegistry(registry, ev.name, ev.interface, ev.version);
            }
        },
        else => {},
    }
}

var wm: WindowManager = undefined;
var cfg: config.Config = undefined;

pub fn main(init: std.process.Init) !void {
    cfg = config.Config.load(init.gpa, init.io);
    defer cfg.deinit(init.gpa);

    const display = try wl.Display.connect(null);
    defer display.disconnect();

    var globals: Globals = .{};
    const registry = try display.getRegistry();
    registry.setListener(*Globals, registryListener, &globals);

    if (display.roundtrip() != .SUCCESS) fatal("Roundtrip failed.", .{});

    titlebar.compositor = globals.wl_compositor;
    titlebar.shm = globals.wl_shm;
    titlebar.wm_obj = globals.river_window_manager_v1;
    titlebar.init();

    wm = .{
        .gpa = init.gpa,
        .io = init.io,
        .obj = globals.river_window_manager_v1 orelse
            fatal("river_window_manager_v1 not supported by the Wayland server.", .{}),
        .xkb_bindings = globals.river_xkb_bindings_v1 orelse
            fatal("river_xkb_bindings_v1 not supported by the Wayland server.", .{}),
        .seats = undefined,
        .outputs = undefined,
        .windows = undefined,
    };
    wm.seats.init();
    wm.outputs.init();
    wm.windows.init();

    while (true) {
        if (display.dispatch() != .SUCCESS) {
            fatal("Dispatch failed.", .{});
        }
    }
}
