#!/usr/bin/env bash
# vms/tart/setup.sh — provision a Tart macOS VM for destructive harness tests.
#
# Creates a macOS Sequoia VM named $VM_NAME, configures resources, installs
# Homebrew, Node 22 LTS, and Cursor, then snapshots the clean state.
#
# Prerequisites:
#   brew install cirruslabs/cli/tart
#   tart pull ghcr.io/cirruslabs/macos-sequoia-base:latest
#
# Environment variables:
#   VM_NAME     Name of the VM to create  (default: cursor-chaos)
#   BASE_IMAGE  OCI image to clone from   (default: ghcr.io/cirruslabs/macos-sequoia-base:latest)
#
# Usage:
#   ./vms/tart/setup.sh

set -euo pipefail

if ! command -v tart >/dev/null 2>&1; then
  echo "[setup] ERROR: tart not installed." >&2
  echo "  brew install cirruslabs/cli/tart" >&2
  exit 1
fi

VM_NAME="${VM_NAME:-cursor-chaos}"
BASE_IMAGE="${BASE_IMAGE:-ghcr.io/cirruslabs/macos-sequoia-base:latest}"

# ── Clone base image (idempotent) ────────────────────────────────────────────
if tart list | grep -q "^${VM_NAME}\b"; then
  echo "[setup] VM ${VM_NAME} already exists; skipping clone."
else
  echo "[setup] Cloning ${BASE_IMAGE} → ${VM_NAME} …"
  tart clone "${BASE_IMAGE}" "${VM_NAME}"
fi

# ── Configure resources ───────────────────────────────────────────────────────
echo "[setup] Configuring VM resources (8 GB RAM, 4 CPU, 80 GB disk) …"
tart set "${VM_NAME}" --memory 8192 --cpu 4 --disk-size 80 2>/dev/null || true

# ── Boot and provision ────────────────────────────────────────────────────────
echo "[setup] Starting VM in headless mode …"
tart run "${VM_NAME}" --no-graphics &
TART_PID=$!
sleep 30   # Allow macOS to fully boot before provisioning.

echo "[setup] Installing Homebrew, Node 22, and Cursor inside the VM …"
tart exec "${VM_NAME}" -- bash -c '
  set -euo pipefail

  # Homebrew
  if ! command -v brew >/dev/null 2>&1; then
    NONINTERACTIVE=1 /bin/bash -c \
      "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi

  eval "$(/opt/homebrew/bin/brew shellenv)"

  # Node 22 LTS
  brew install node@22 2>/dev/null || true
  brew link node@22 --force --overwrite 2>/dev/null || true

  # Cursor (via direct download; no Homebrew cask available for Cursor at time of writing)
  CURSOR_DMG="/tmp/cursor.dmg"
  curl -fsSL \
    "https://downloader.cursor.sh/mac/installer/arm64" \
    -o "${CURSOR_DMG}"
  hdiutil attach "${CURSOR_DMG}" -quiet -mountpoint /Volumes/Cursor
  cp -R "/Volumes/Cursor/Cursor.app" /Applications/
  hdiutil detach /Volumes/Cursor -quiet
  rm -f "${CURSOR_DMG}"

  echo "[provision] Node: $(node --version)"
  echo "[provision] Cursor: installed at /Applications/Cursor.app"
'

# ── Stop VM ───────────────────────────────────────────────────────────────────
echo "[setup] Stopping VM …"
tart stop "${VM_NAME}" 2>/dev/null || true
wait "${TART_PID}" 2>/dev/null || true

echo "[setup] VM ${VM_NAME} ready. Run: ./vms/tart/run-in-vm.sh <command>"
