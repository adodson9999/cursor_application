#!/usr/bin/env bash
# vms/tart/setup.sh — provision a Tart macOS VM for destructive harness tests
#
# Creates a macOS 14 Sonoma Tart VM named "cursor-pqe", installs Homebrew,
# Node 22 LTS, and Cursor, then snapshots the clean state so teardown.sh
# can restore it quickly between runs.
#
# Prerequisites:
#   brew install cirruslabs/cli/tart
#   tart pull ghcr.io/cirruslabs/macos-sonoma-base:latest
#
# Usage:
#   ./vms/tart/setup.sh
#
# Stage 2 fills in the full provisioning sequence.

set -euo pipefail

exit 0
