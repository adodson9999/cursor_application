#!/usr/bin/env bash
# vms/tart/teardown.sh — stop and delete the Tart VM, restoring from snapshot
# if one exists, or removing the VM entirely.
#
# Usage:
#   ./vms/tart/teardown.sh          # stop + delete VM
#   KEEP_VM=1 ./vms/tart/teardown.sh  # stop only (no delete)
#
# Environment variables:
#   VM_NAME   Name of the VM to teardown  (default: cursor-chaos)
#   KEEP_VM   If set to "1", stop but do not delete the VM

set -euo pipefail

if ! command -v tart >/dev/null 2>&1; then
  echo "[teardown] ERROR: tart not installed." >&2
  echo "  brew install cirruslabs/cli/tart" >&2
  exit 1
fi

VM_NAME="${VM_NAME:-cursor-chaos}"
KEEP_VM="${KEEP_VM:-0}"

echo "[teardown] Stopping VM ${VM_NAME} (if running) …"
tart stop "${VM_NAME}" 2>/dev/null || true

if [[ "${KEEP_VM}" == "1" ]]; then
  echo "[teardown] KEEP_VM=1 — VM stopped but not deleted."
  exit 0
fi

echo "[teardown] Deleting VM ${VM_NAME} …"
tart delete "${VM_NAME}" 2>/dev/null || true

echo "[teardown] VM ${VM_NAME} removed. Run setup.sh to re-provision."
