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

Rich operation receipts are persisted under `/app/data/rich-journal/<sha256 OAuth user>/<captured account id>` (or explicit `MCP_TELEGRAM_RICH_JOURNAL_ROOT`). The directory MUST be persistent and writable. Ambiguous/rejected receipts set `isError:true` while preserving their requestId.

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


## Inline image in one native Rich send (Draft, requires new core and Cloud image)

`telegram-send-rich-message` now accepts an optional `photo` alongside `markdown`:

```json
{
  "chatId": "@no_skazhu",
  "requestId": "<fresh UUID v4>",
  "markdown": "# Обогатили Telegram\n\n| Было | Стало |\n|---|---|\n| Текст | Rich |",
  "photo": {
    "source": { "kind": "url", "url": "https://public-example.example/cat.jpg" },
    "caption": "Царь Шрёдингера на помойке",
    "placement": "before"
  }
}
```

The URL must be genuinely public HTTPS; Cloud uses the existing SSRF-checked stream fetcher.
For privately generated files, upload them first with `telegram-create-upload-link` or `POST /my/upload`, then use `{kind:"upload", uploadId:"upl_..."}`. **The upload is staging only**, never a channel message. A ChatGPT sandbox file path cannot be passed directly to the remote Cloud server.

The one MCP send call resolves the photo (max 20 MiB; JPEG, PNG, WebP), stages it via MTProto `messages.uploadMedia` (does not publish), builds `PageBlockPhoto` and `InputRichMessage.photos`, then calls `messages.sendMessage` **once** with the complete Rich message. Existing UUID journal, exact chat allowlist, Premium check and readback apply to the combined payload. Replays with the same UUID read the durable receipt without re-uploading or reposting; mismatched payloads are refused.

Only one photo per Rich call is implemented here. Slideshows/carousels and video are out of scope. Do not claim these work in this build. Never post to a channel without explicit approval of the exact image and text.

Readback additionally checks that every PageBlockPhoto ID is present in the Telegram-returned RichMessage.photos array. If message delivery succeeded but the media reference/readback cannot be verified, the journal preserves the sent message ID and callers must inspect it, **not resend**.

## Reusing a photo from Telegram Saved Messages (no re-upload)

If an image is **already in the same account's Saved Messages**, the Rich send can reference the photo's Telegram ID directly:

```json
{
  "chatId": "@no_skazhu",
  "requestId": "<fresh UUID v4>",
  "markdown": "# Rich post\\n\\nText and native table",
  "photo": {
    "source": {"kind": "telegram", "chatId": "me", "messageId": 400468},
    "placement": "before"
  }
}
```

The Cloud validates `chatId: "me"` (other source chats are rejected). Core looks up the source message with the **same authenticated MTProto session**, checks it contains a real Telegram Photo or a native Rich photo, and constructs `InputPhoto` + `PageBlockPhoto` without downloading media or calling `messages.uploadMedia`. Telegram receives **one Rich publication**. The original Saved Messages image remains in place.

This supports a one-click publishing workflow for images **already staged in Telegram**. It does **not** move local ChatGPT-generated bytes into Saved Messages automatically: a fresh image must still be delivered to Telegram once, via the existing upload link/URL or manually via the Telegram app. No Google Drive auth or public image URL is needed for reuse.

Tests must cover one send, no uploadMedia call, strict source `me`, rejection of missing/non-photo media, and receipt replay.
