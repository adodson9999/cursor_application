#!/usr/bin/env node
/**
 * severity_cli.ts — thin stdin → score → stdout wrapper for parity testing.
 * Called by tests/05_redteam_ai/test_severity_parity.py via subprocess.
 *
 * Usage: echo '<json>' | npx tsx voc/classify/severity_cli.ts
 */
import { score } from "./severity.js";

const chunks: string[] = [];
for await (const chunk of process.stdin) chunks.push(String(chunk));
const signal = JSON.parse(chunks.join("")) as Parameters<typeof score>[0];
process.stdout.write(JSON.stringify(score(signal)) + "\n");
