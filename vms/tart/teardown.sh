#!/usr/bin/env bash
# vms/tart/teardown.sh — restore the Tart VM to its clean snapshot
#
# Stops the running "cursor-pqe" VM if active, deletes it, and clones a fresh
# copy from the pre-provisioned clean snapshot so the next run-in-vm.sh starts
# from a known-good state. Data from the last run is expected to have been
# retrieved by run-in-vm.sh before this script is called.
#
# Usage:
#   ./vms/tart/teardown.sh
#
# Stage 2 fills in the stop, delete, and clone-from-snapshot sequence.

set -euo pipefail

exit 0
