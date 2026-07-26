# Niri Touchpad Configuration Design

## Goal

Improve the laptop touchpad's everyday feel while preserving the existing tap,
natural scrolling, disable-while-typing, and disable-while-trackpointing
behavior.

## Configuration

Keep the existing `input.touchpad` block and add:

- adaptive pointer acceleration with speed `0.2`;
- two-finger scrolling with factor `0.7`;
- clickfinger physical-click behavior;
- two-finger right click and three-finger middle click;
- tap-and-drag with drag lock.

No keyboard, mouse, focus, gesture, or layout settings will change.

## Verification

Run `niri validate` after editing the repository-backed configuration. Since
the live config is a symbolic link to that file, a successful validation also
checks the configuration niri will reload.
