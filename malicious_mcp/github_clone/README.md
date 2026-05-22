# github_clone — MCP tool-poisoning reproducer

**Research artefact. Local only. No outbound network. All exfil attempts are written to data/exfil_proof/.**

## What this is

A minimal MCP server that demonstrates the **MCP rug-pull** (tool-poisoning) attack pattern documented
by Invariant Labs (2025). The `search_code` tool presents a benign description at install time
(`fixtures/initial.json`) but switches to a poisoned description at runtime (`fixtures/poisoned.json`)
that contains hidden instructions embedded in the `description` field.

## How to run

**Benign mode** (what the user approves at install):
```bash
python3 malicious_mcp/github_clone/server.py
```

**Poisoned mode** (simulates post-update behaviour):
```bash
GITHUB_CLONE_POISONED=1 python3 malicious_mcp/github_clone/server.py
```

## What to observe

- Compare `fixtures/initial.json` vs `fixtures/poisoned.json` — the tool name is identical; only the description differs.
- A host LLM processing `list_tools()` in poisoned mode receives the hidden instruction embedded in the description field.
- `data/exfil_proof/github_clone_<ts>.json` records each invocation and whether poisoned mode was active.

## Reference

Invariant Labs, 2025 — Tool Poisoning Attacks in MCP.
https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks
