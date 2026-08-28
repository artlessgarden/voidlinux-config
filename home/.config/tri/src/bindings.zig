//! Pure keyboard binding defaults, parsing, and conflict handling.

const std = @import("std");
const xkb = @import("xkbcommon");

pub const Action = enum {
    none,
    term,
    browser,
    memo,
    screenshot,
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
    exit,
    flip_ratio,
    flip_columns,
    expand_slot_1,
    expand_slot_2,
    expand_slot_3,
    expand_slot_4,
    expand_slot_5,
    expand_slot_6,
    expand_slot_7,
    expand_slot_8,
    expand_slot_9,
    move_slot_1,
    move_slot_2,
    move_slot_3,
    move_slot_4,
    move_slot_5,
    move_slot_6,
    move_slot_7,
    move_slot_8,
    move_slot_9,

    pub fn needsTiledSlot(self: Action) bool {
        return switch (self) {
            .term, .browser, .memo, .screenshot => true,
            else => false,
        };
    }
};

pub const action_count = @typeInfo(Action).@"enum".fields.len;

pub const Modifiers = packed struct(u4) {
    shift: bool = false,
    ctrl: bool = false,
    alt: bool = false,
    super: bool = false,
};

pub const Binding = struct {
    mods: Modifiers,
    keysym: xkb.Keysym,
};

pub const Status = enum { default, override, disabled, invalid, conflict };

pub const Overrides = struct {
    values: [action_count]?[]const u8 = .{null} ** action_count,

    pub fn set(self: *Overrides, action: Action, value: []const u8) void {
        self.values[index(action)] = value;
    }

    pub fn get(self: *const Overrides, action: Action) ?[]const u8 {
        return self.values[index(action)];
    }
};

pub const Resolved = struct {
    bindings: [action_count]?Binding,
    statuses: [action_count]Status,
    invalid_overrides: [action_count]bool,

    pub fn get(self: *const Resolved, action: Action) ?Binding {
        return self.bindings[index(action)];
    }

    pub fn status(self: *const Resolved, action: Action) Status {
        return self.statuses[index(action)];
    }

    pub fn wasInvalid(self: *const Resolved, action: Action) bool {
        return self.invalid_overrides[index(action)];
    }
};

pub fn actionFromName(name: []const u8) ?Action {
    const action = std.meta.stringToEnum(Action, name) orelse return null;
    return if (action == .none) null else action;
}

pub fn defaultFor(action: Action) ?Binding {
    const super: Modifiers = .{ .super = true };
    const super_shift: Modifiers = .{ .super = true, .shift = true };
    const super_ctrl_shift: Modifiers = .{ .super = true, .ctrl = true, .shift = true };
    const none: Modifiers = .{};
    return switch (action) {
        .none => null,
        .term => bind(super, .a),
        .browser => bind(super, .c),
        .memo => bind(super, .v),
        .screenshot => bind(super, .w),
        .brightness_up => bind(none, .XF86MonBrightnessUp),
        .brightness_down => bind(none, .XF86MonBrightnessDown),
        .volume_up => bind(none, .XF86AudioRaiseVolume),
        .volume_down => bind(none, .XF86AudioLowerVolume),
        .volume_mute => bind(none, .XF86AudioMute),
        .power_off => bind(super, .Escape),
        .close => bind(super_shift, .q),
        .focus_toggle => bind(super, .s),
        .expand_next => bind(super, .d),
        .expand_prev => bind(super, .e),
        .swap => bind(super_shift, .s),
        .move_expand_next => bind(super_shift, .d),
        .move_expand_prev => bind(super_shift, .e),
        .fill_screen => bind(super, .f),
        .exit => bind(super_ctrl_shift, .q),
        .flip_ratio => bind(super, .r),
        .flip_columns => bind(super_shift, .r),
        .expand_slot_1 => bind(super, .@"1"),
        .expand_slot_2 => bind(super, .@"2"),
        .expand_slot_3 => bind(super, .@"3"),
        .expand_slot_4 => bind(super, .@"4"),
        .expand_slot_5 => bind(super, .@"5"),
        .expand_slot_6 => bind(super, .@"6"),
        .expand_slot_7 => bind(super, .@"7"),
        .expand_slot_8 => bind(super, .@"8"),
        .expand_slot_9 => bind(super, .@"9"),
        .move_slot_1 => bind(super_shift, .@"1"),
        .move_slot_2 => bind(super_shift, .@"2"),
        .move_slot_3 => bind(super_shift, .@"3"),
        .move_slot_4 => bind(super_shift, .@"4"),
        .move_slot_5 => bind(super_shift, .@"5"),
        .move_slot_6 => bind(super_shift, .@"6"),
        .move_slot_7 => bind(super_shift, .@"7"),
        .move_slot_8 => bind(super_shift, .@"8"),
        .move_slot_9 => bind(super_shift, .@"9"),
    };
}

pub fn parse(raw: []const u8) !?Binding {
    const text = std.mem.trim(u8, raw, " \t\r");
    if (std.ascii.eqlIgnoreCase(text, "none")) return null;
    if (text.len == 0) return error.InvalidBinding;

    var mods: Modifiers = .{};
    var keysym: ?xkb.Keysym = null;
    var tokens = std.mem.splitScalar(u8, text, '+');
    while (tokens.next()) |raw_token| {
        const token = std.mem.trim(u8, raw_token, " \t");
        if (token.len == 0) return error.InvalidBinding;
        if (std.ascii.eqlIgnoreCase(token, "Super")) {
            if (mods.super) return error.InvalidBinding;
            mods.super = true;
        } else if (std.ascii.eqlIgnoreCase(token, "Ctrl")) {
            if (mods.ctrl) return error.InvalidBinding;
            mods.ctrl = true;
        } else if (std.ascii.eqlIgnoreCase(token, "Shift")) {
            if (mods.shift) return error.InvalidBinding;
            mods.shift = true;
        } else if (std.ascii.eqlIgnoreCase(token, "Alt")) {
            if (mods.alt) return error.InvalidBinding;
            mods.alt = true;
        } else {
            if (keysym != null or token.len >= 128) return error.InvalidBinding;
            var name_buf: [128]u8 = undefined;
            const name = std.fmt.bufPrintZ(&name_buf, "{s}", .{token}) catch return error.InvalidBinding;
            const parsed = xkb.Keysym.fromName(name, .case_insensitive);
            if (@intFromEnum(parsed) == 0) return error.InvalidBinding;
            keysym = parsed;
        }
    }
    return .{ .mods = mods, .keysym = keysym orelse return error.InvalidBinding };
}

pub fn resolve(overrides: *const Overrides) Resolved {
    var result: Resolved = .{
        .bindings = .{null} ** action_count,
        .statuses = .{.disabled} ** action_count,
        .invalid_overrides = .{false} ** action_count,
    };

    for (0..action_count) |i| {
        const action: Action = @enumFromInt(i);
        if (overrides.get(action)) |raw| {
            result.bindings[i] = parse(raw) catch fallback: {
                result.bindings[i] = defaultFor(action);
                result.statuses[i] = .invalid;
                result.invalid_overrides[i] = true;
                break :fallback result.bindings[i];
            };
            if (result.statuses[i] != .invalid) {
                result.statuses[i] = if (result.bindings[i] == null) .disabled else .override;
            }
        } else {
            result.bindings[i] = defaultFor(action);
            result.statuses[i] = if (result.bindings[i] == null) .disabled else .default;
        }

        const candidate = result.bindings[i] orelse continue;
        for (result.bindings[0..i]) |existing| {
            if (existing) |other| {
                if (std.meta.eql(candidate, other)) {
                    result.bindings[i] = null;
                    result.statuses[i] = .conflict;
                    break;
                }
            }
        }
    }
    return result;
}

fn bind(mods: Modifiers, keysym: xkb.Keysym) Binding {
    return .{ .mods = mods, .keysym = keysym };
}

fn index(action: Action) usize {
    return @intFromEnum(action);
}
