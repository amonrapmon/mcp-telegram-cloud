# Native Rich Messages (Cloud fork)

The existing OAuth-authenticated Telegram user session remains the transport. The pinned core fork supports MTProto TL layer 233, native Rich blocks and an idempotent send journal. No Bot API token or new login required.

## Tools

Read-only: preview-rich-message, rich-message-capabilities, get-rich-message, get-rich-send-status. Write (disabled by default): send-rich-message, edit-rich-message, save-rich-draft.

## Explicit opt-in (NOT enabled by this PR)

```sh
MCP_TELEGRAM_ENABLE_RICH_WRITE=0
MCP_TELEGRAM_RICH_ALLOWED_CHAT_IDS=
# After review, a read-only capability check and a test plan:
# MCP_TELEGRAM_ENABLE_RICH_WRITE=1
# MCP_TELEGRAM_RICH_ALLOWED_CHAT_IDS=me
# Expand only after test: me,@no_skazhu,-1003910108429
```

Both the env flag (=1) and exact destination allowlist are mandatory. The write-tools are absent unless enabled. No edits to production secrets, domain or session volume in this change.

A requestId UUIDv4 protects against duplicate submissions. After a timeout, query get-rich-send-status with the SAME ID. Do not retry with a new one before reconciling actual Telegram history.

Supported in MVP: text-rich headings, tables, lists, quotes, links, code; **not** media, HTML, formulas, footnotes or nested lists. Reject unsupported constructs rather than silently stripping them.

## Test plan

1. Core: run schema installer and check pinned TL layer, TypeScript and Rich tests.
2. Cloud: run typecheck, test suite and parity check. Both current npm manifest and fork-only additions are intentionally handled.
3. Test Docker build in a separate environment. No production deploy.
4. Read-only capabilities check using authenticated account.
5. Explicit owner approval for a single send to Saved Messages with only `me` allowed.
6. Read back, inspect Telegram clients, expand allowlist to NПНС only after review.

Rollback: previous Cloud image and core Git SHA. Session data is not migrated or modified by this PR.

Source: [Core fork PR](https://github.com/amonrapmon/mcp-telegram/pull/1).
