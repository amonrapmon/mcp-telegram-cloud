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

Supported: Rich headings, tables, lists, quotes, links, code, plus **one inline photo** via the separate `photo` field. Unsupported: HTML, Markdown image tags, multiple photos, formulas, footnotes or nested lists. Reject unsupported constructs rather than silently stripping them.

## Test plan

1. Core: run schema installer and check pinned TL layer, TypeScript and Rich tests.
2. Cloud: run typecheck, test suite and parity check. Both current npm manifest and fork-only additions are intentionally handled.
3. Test Docker build in a separate environment. No production deploy.
4. Read-only capabilities check using authenticated account.
5. Explicit owner approval for a single send to Saved Messages with only `me` allowed.
6. Read back, inspect Telegram clients, expand allowlist to NПНС only after review.

Rollback: previous Cloud image and core Git SHA. Session data is not migrated or modified by this PR.

Source: [Core fork PR](https://github.com/amonrapmon/mcp-telegram/pull/1).


## Inline image in one native Rich send (live verified)

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

The URL must be HTTPS and accessible to Cloud's existing SSRF-protected fetcher. **An expiring Google Drive raw-download signed URL works without making the Drive file public.** The ordinary Google Drive `/view` link is NOT a raw image URL. For a ChatGPT image, prefer the [agent workflow](../skills/telegram-rich-publish/SKILL.md). Without Drive, use `telegram-create-upload-link` or `POST /my/upload`, then `{kind:"upload", uploadId:"upl_..."}`. Staging is not a separate public post. Local ChatGPT sandbox paths are not accessible to the remote Cloud server.

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

## Google Drive bridge from a ChatGPT image (no Saved Messages step)

The Google Drive connector can upload an image generated or uploaded in ChatGPT using its file reference. A subsequent authenticated Google Drive `fetch` with `download_raw_file:true, include_base64:false` provides an expiring `file_uri.download_url` containing **raw image bytes over HTTPS**, not a regular `/file/d/.../view` URL.

Pass that HTTPS download URL to `telegram-send-rich-message` as `photo.source={kind:"url",url:download_url}`. The Cloud URL fetcher checks SSRF/IP/size/redirect limits and streams bytes to MTProto; Core now normalizes the uploaded photo file name based on sniffed MIME to avoid `PHOTO_EXT_INVALID` when signed download URLs have opaque extensionless paths. The public Telegram channel receives only the final single Rich message.

Do not copy signed `download_url` into a public post or log: it is temporary file access. A standard Drive viewing link is NOT a raw download link and may be private. Reuse the **exact same URL** when replaying a durable request UUID: image source URL is part of the immutable hash; on expiration request a fresh link and **new** UUID only if no earlier send succeeded or remained uncertain.

**Live verification, 2026-11-21:** ChatGPT image bytes were uploaded by the connected Google Drive `upload_file(file_uri)` action. An authorized `fetch(download_raw_file:true,include_base64:false)` returned an expiring raw HTTPS `file_uri.download_url`. Source file remained private. Initial Telegram errors were `PHOTO_EXT_INVALID` (opaque signed URL lacked image extension, fixed in Core commit `3321277`) and then `IMAGE_PROCESS_FAILED` for the original PNG. The SAME illustration converted to JPEG was accepted. Saved Messages test **#400627** verified `photoCount:1`, `tableCount:1`. Approved public post [@no_skazhu/#8](https://t.me/no_skazhu/8) was **one** native Rich message: `verified:true`, `partial:false`, `photoReferencesValid:true`, `photoCount:1`, `tableCount:1`, **47 blocks**, `unsupported:[]`, with no separate photo publication or edit.

**Agent default:** generated/chat attachment file reference → real JPEG (convert PNG as needed) → Google Drive `upload_file` → Google Drive `fetch` with raw-download flags → `telegram-preview-rich-message` → ONE `telegram-send-rich-message` with `photo.source.kind:"url"` and the signed raw URL → `telegram-get-rich-message` → `telegram-get-message-link`. Use the signed URL promptly and never disclose it. UUID and URL participate in idempotent payload hashing. A new signed URL requires a new UUID only after an earlier attempt has been **conclusively rejected**; uncertain sends must be reconciled and not blindly retried.

See **[telegram-rich-publish agent skill](../skills/telegram-rich-publish/SKILL.md)**.

## Mobile-first editorial layer (before transport)

Agent authorship and mobile readability are handled by [`telegram-mobile-editor`](../skills/telegram-mobile-editor/SKILL.md), **before** `telegram-rich-publish` stages photos or sends. The editing pass preserves the user's meaning, factual details, author voice, timing of jokes and exact user-approved wording. It favors compact paragraphs, one thought per block, meaningful headings, short table cells and selective emphasis. Avoid both walls of text and one-sentence-per-line ladders. No rigid length limits should be misrepresented as Telegram or research requirements.

The Markdown compiler's `telegram-preview-rich-message` checks block structure and limits; it cannot reproduce actual Telegram mobile layout, screen width, font scaling or app behavior. A visual rendering claim requires an observed screenshot/device preview. Publishing always requires approved destination/copy and a verifiable receipt.

Research sources: [NN/g reading patterns](https://www.nngroup.com/articles/how-people-read-online/), [GOV.UK clear language](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/), [ONS mobile reading](https://service-manual.ons.gov.uk/content/writing-for-users/how-people-read-online).
