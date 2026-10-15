#!/usr/bin/env bash
# Copy the working repo (code, docs, git history) back to the shared project folder.
# node_modules and dist stay local. Usage: scripts/sync-to-shared.sh
set -euo pipefail
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="/mnt/project-files/zeus"
mkdir -p "$DEST"
tar -C "$SRC" --exclude=./node_modules --exclude=./dist --exclude=./screenshots -cf - . | tar -C "$DEST" -xf -
echo "Synced $SRC -> $DEST at $(git -C "$SRC" rev-parse --short HEAD)"
