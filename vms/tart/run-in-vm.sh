#!/usr/bin/env bash
# vms/tart/run-in-vm.sh — start the Tart VM, run the destructive test suite,
# and copy reports back to the host.
#
# Usage:
#   ./vms/tart/run-in-vm.sh                         # run all VM-gated specs
#   ./vms/tart/run-in-vm.sh "npx playwright test tests/08_chaos/"
#
# Environment variables:
#   VM_NAME       Name of the VM to use         (default: cursor-chaos)
#   HARNESS_DIR   Absolute path to harness root  (default: <repo>/worktrees/harness)
#   REPORTS_DIR   Where to copy reports back to  (default: $HARNESS_DIR/reports/vm)

set -euo pipefail

if ! command -v tart >/dev/null 2>&1; then
  echo "[run-in-vm] ERROR: tart not installed." >&2
  echo "  brew install cirruslabs/cli/tart" >&2
  exit 1
fi

VM_NAME="${VM_NAME:-cursor-chaos}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="${HARNESS_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
REPORTS_DIR="${REPORTS_DIR:-${HARNESS_DIR}/reports/vm}"
CMD="${1:-npx playwright test tests/07_destructive_vm/ tests/08_chaos/}"

mkdir -p "${REPORTS_DIR}"

echo "[run-in-vm] Starting VM ${VM_NAME} …"
tart run "${VM_NAME}" --no-graphics \
  --dir="harness:${HARNESS_DIR}:ro" &
TART_PID=$!

# Allow boot and directory share to settle.
sleep 30

echo "[run-in-vm] Executing: RUN_IN_VM=1 ${CMD}"
tart exec "${VM_NAME}" -- bash -c "
  set -euo pipefail
  eval \"\$(/opt/homebrew/bin/brew shellenv)\"
  cd /Volumes/My\ Shared\ Files/harness
  npm ci --silent
  RUN_IN_VM=1 ${CMD}
" 2>&1 | tee "${REPORTS_DIR}/vm-run-$(date +%Y%m%dT%H%M%S).log"

echo "[run-in-vm] Copying reports from VM …"
tart exec "${VM_NAME}" -- bash -c "
  cd /Volumes/My\ Shared\ Files/harness
  tar czf /tmp/vm-reports.tar.gz reports/ 2>/dev/null || true
"
# Retrieve the archive via tart exec cat pipe (no scp needed with directory sharing).
tart exec "${VM_NAME}" -- cat /tmp/vm-reports.tar.gz \
  | tar xzf - -C "${HARNESS_DIR}" 2>/dev/null || true

echo "[run-in-vm] Stopping VM …"
tart stop "${VM_NAME}" 2>/dev/null || true
wait "${TART_PID}" 2>/dev/null || true

echo "[run-in-vm] Done. Reports at: ${REPORTS_DIR}"
