# Configurable Bindings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let every tri keyboard action be overridden in `config` while preserving the current bindings as safe built-in defaults.

**Architecture:** A small compositor-independent `bindings.zig` owns action names, defaults, key parsing, disable semantics, and collision resolution. `config.zig` stores optional raw overrides, and `main.zig` registers only the resolved bindings with River.

**Tech Stack:** Zig 0.16, libxkbcommon, River xkb bindings v1

**Spec:** User-approved chat design from 2026-08-28.

## Global Constraints

- Missing overrides use current built-in defaults.
- `none` disables one action.
- Invalid overrides fall back to that action's default.
- Duplicate resolved key combinations keep the first action and disable later actions.
- No dynamic allocation is required for resolved binding state.

---

### Task 1: Pure binding model

**Files:**
- Create: `src/bindings.zig`
- Modify: `src/tests.zig`
- Modify: `build.zig`

- [ ] Add failing tests for valid modifiers, xkb key names, `none`, invalid fallback, and duplicate suppression.
- [ ] Implement `Action`, `Modifiers`, `Binding`, built-in defaults, parser, and resolver.
- [ ] Link libxkbcommon in unit tests and verify all tests pass.

### Task 2: Configuration and River integration

**Files:**
- Modify: `src/config.zig`
- Modify: `src/main.zig`

- [ ] Parse `bind.<action> = <combination>` into fixed per-action overrides.
- [ ] Replace hard-coded River binding creation with resolved bindings and warnings.
- [ ] Keep spawn-limit behavior and all action handlers unchanged.

### Task 3: Defaults, documentation, and release

**Files:**
- Modify: `config`
- Modify: `CODE.md`
- Modify: `README.md`

- [ ] List every current default binding in the shipped config.
- [ ] Document syntax, disabling, fallback, and collision behavior.
- [ ] Run formatting, unit tests, ReleaseSafe build, rebuild the tracked binary, verify hashes, commit, and push.
