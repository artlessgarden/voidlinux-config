// SPDX-License-Identifier: 0BSD
//! Simple key=value config for tri (~/.config/tri/config or $TRI_CONFIG).

const std = @import("std");
pub const Config = struct {
    master_ratio: f32 = 0.62,
    slot0_ratio: f32 = 0.4,
    cursor_size: u32 = 28,
    cursor_theme: [:0]const u8 = "Adwaita",
    memo_path: []const u8 = "/home/xiang/Drafts/memo/inbox.md",
    term: []const u8 = "alacritty",
    browser: []const u8 = "helium",
    output: []const u8 = "eDP-1",
    mode: []const u8 = "2560x1600@60Hz",
    scale: []const u8 = "1.5",

    strings: std.ArrayListUnmanaged([]const u8) = .empty,

    pub fn deinit(self: *Config, gpa: std.mem.Allocator) void {
        for (self.strings.items) |s| gpa.free(s);
        self.strings.deinit(gpa);
    }

    fn dup(self: *Config, gpa: std.mem.Allocator, value: []const u8) ![]const u8 {
        const copy = try gpa.dupe(u8, value);
        try self.strings.append(gpa, copy);
        return copy;
    }

    fn dupZ(self: *Config, gpa: std.mem.Allocator, value: []const u8) ![:0]const u8 {
        const copy = try gpa.allocSentinel(u8, value.len, 0);
        @memcpy(copy, value);
        try self.strings.append(gpa, copy);
        return copy;
    }

    fn apply(self: *Config, gpa: std.mem.Allocator, key: []const u8, value: []const u8) !void {
        if (std.mem.eql(u8, key, "master_ratio")) {
            self.master_ratio = try std.fmt.parseFloat(f32, value);
        } else if (std.mem.eql(u8, key, "cursor_size")) {
            self.cursor_size = try std.fmt.parseInt(u32, value, 10);
        } else if (std.mem.eql(u8, key, "cursor_theme")) {
            self.cursor_theme = try self.dupZ(gpa, value);
        } else if (std.mem.eql(u8, key, "slot0_ratio")) {
            self.slot0_ratio = try std.fmt.parseFloat(f32, value);
        } else if (std.mem.eql(u8, key, "memo")) {
            self.memo_path = try self.dup(gpa, value);
        } else if (std.mem.eql(u8, key, "term")) {
            self.term = try self.dup(gpa, value);
        } else if (std.mem.eql(u8, key, "browser")) {
            self.browser = try self.dup(gpa, value);
        } else if (std.mem.eql(u8, key, "output")) {
            self.output = try self.dup(gpa, value);
        } else if (std.mem.eql(u8, key, "mode")) {
            self.mode = try self.dup(gpa, value);
        } else if (std.mem.eql(u8, key, "scale")) {
            self.scale = try self.dup(gpa, value);
        }
    }

    pub fn load(gpa: std.mem.Allocator, io: std.Io) Config {
        var cfg: Config = .{};
        if (std.c.getenv("TRI_CONFIG")) |raw| {
            const path = std.mem.span(raw);
            _ = loadFile(gpa, io, &cfg, path);
            return cfg;
        }
        if (std.c.getenv("HOME")) |raw| {
            const home = std.mem.span(raw);
            var buf: [512]u8 = undefined;
            if (std.fmt.bufPrint(&buf, "{s}/.config/tri/config", .{home})) |path| {
                if (loadFile(gpa, io, &cfg, path)) return cfg;
            } else |_| {}
            if (std.fmt.bufPrint(&buf, "{s}/voidlinux-config/wm/tri/config", .{home})) |path| {
                _ = loadFile(gpa, io, &cfg, path);
            } else |_| {}
        }
        return cfg;
    }

    fn loadFile(gpa: std.mem.Allocator, io: std.Io, cfg: *Config, path: []const u8) bool {
        const file = std.Io.Dir.cwd().openFile(io, path, .{}) catch return false;
        defer file.close(io);
        const stat = file.stat(io) catch return false;
        if (stat.size > 64 * 1024) return false;
        const size: usize = @intCast(stat.size);
        const data = gpa.alloc(u8, size) catch return false;
        defer gpa.free(data);
        const n = file.readPositionalAll(io, data, 0) catch return false;
        var lines = std.mem.splitScalar(u8, data[0..n], '\n');
        while (lines.next()) |raw| {
            const line = std.mem.trim(u8, raw, " \t\r");
            if (line.len == 0 or line[0] == '#') continue;
            const eq = std.mem.indexOfScalar(u8, line, '=') orelse continue;
            const key = std.mem.trim(u8, line[0..eq], " \t");
            const value = std.mem.trim(u8, line[eq + 1 ..], " \t");
            cfg.apply(gpa, key, value) catch continue;
        }
        return true;
    }
};
