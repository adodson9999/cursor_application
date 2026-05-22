#!/usr/bin/env bash
# vms/tart/run-in-vm.sh — start the Tart VM and execute the destructive test suite
#
# Starts the "cursor-pqe" Tart VM, copies the harness into it via SSH, runs
# `RUN_IN_VM=1 npx playwright test tests/07_destructive_vm/ tests/08_chaos/`,
# then copies the resulting reports back to the host before shutting the VM down.
#
# Usage:
#   ./vms/tart/run-in-vm.sh [--headless]
#
# Stage 2 fills in the VM start, rsync, remote test invocation, and report retrieval.

set -euo pipefail

exit 0
