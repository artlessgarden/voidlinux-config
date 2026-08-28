#!/bin/sh
set -e
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
zig build -Doptimize=ReleaseSafe
echo "built zig-out/bin/tri"
