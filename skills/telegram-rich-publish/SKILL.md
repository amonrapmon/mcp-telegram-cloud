---
name: telegram-rich-publish
description: Publish an approved native Telegram Rich message with headings, tables and one photo. Use when a ChatGPT-generated or attached image needs to go to Telegram via connected Google Drive without manual uploads or intermediate Saved Messages. Also handles native Rich send receipts, readback and failures.
---

# Telegram Rich publication: ChatGPT image → Drive → Telegram

Use this workflow when the user approves a Telegram channel post with an image. The end result is **one** final Telegram message, not one total MCP call. Keep the exact approved text, image and destination. A clear "publish this approved draft" is sufficient approval; do not unnecessarily reconfirm it. Do not switch to a stock picture or send the text without the requested photo.

## Editorial gate before transfer (mandatory for authored posts)

Before requesting image bytes or a signed URL, run the editorial review in [`telegram-mobile-editor`](../telegram-mobile-editor/SKILL.md). Use its mobile readability and tone guidance for **new and revised** posts; keep a previously approved exact post intact unless the user requests edits or approves the revised version. Confirm the final Markdown and intended image are authorized. This review must not send anything; the present skill alone owns transport, native preview, UUID handling and publication.

## Default flow (verified live 2026-11-21)

1. Get the **actual generated/uploaded image file**. Prefer a valid RGB **JPEG** with `.jpg` extension: the real PNG image in our test gave Telegram `IMAGE_PROCESS_FAILED`; conversion of that very same image to JPEG worked. If conversion is needed, flatten alpha appropriately, preserve visual content and aspect ratio. Do not assume every PNG fails.
2. Call connected Google Drive `upload_file` using the **host-provided image file reference** in `file_uri` (not a local `/mnt/data` path and not a made-up URL). Specify `file_name:"image.jpg"` and `mime_type:"image/jpeg"`. Save the actual returned `id` and `url`. **Do not make the Drive file public**; the connector already has authenticated access.
3. Call Google Drive `fetch` with `url` equal to that returned view URL, `download_raw_file:true`, `include_base64:false`. Read `result.file_uri.download_url`; it is an expiring **signed HTTPS URL to the raw image bytes**. Use it promptly. The normal `https://drive.google.com/file/d/.../view` URL is NOT a direct photo URL. Keep the signed URL confidential: never print it in an answer, post, issue or log.
4. Check the Telegram recipient and eligibility if needed (`telegram-get-chat-info`, `telegram-rich-message-capabilities`). Use the **editor-reviewed, approved** Rich Markdown, with the photo in the **separate** `photo` field, not `![](url)`. Validate with `telegram-preview-rich-message`; it checks native block structure but **does not certify mobile visual comfort**. Do not invent tables when the draft contains none.
5. Generate **one fresh UUID v4** for a new publication. Call `telegram-send-rich-message` **once**:
   ```json
   {
     "chatId": "@approved-channel",
     "requestId": "<new UUID v4>",
     "markdown": "# Title\n\nContent\n\n| Feature | Status |\n| --- | --- |\n| Image | Inline |",
     "photo": {
       "source": {"kind": "url", "url": "<the exact signed file_uri.download_url>"},
       "caption": "Optional caption",
       "placement": "before"
     }
   }
   ```
   The transport internally stages photo bytes using `messages.uploadMedia`, then sends **one** native Rich message with the photo block, headings and tables via `messages.sendMessage`. Do not create a separate photo post or edit a text post afterward.
6. Inspect the receipt for `state:"sent"` and `verified:true`. Call `telegram-get-rich-message` with the exact `messageId` and destination. For a photo + table post expect `partial:false`, `photoReferencesValid:true`, `inspection.photoCount:1`, `inspection.tableCount:1`, `unsupported:[]`, `truncated:false`. Table count depends on actual content. Call `telegram-get-message-link` and report the actual URL.
7. Keep the Drive file unless cleanup is explicitly requested/approved. The signed download URL is short-lived but should still be treated as a secret.

## Failures and idempotency (critical)

- A signed URL is part of the Rich request's content hash. Reusing a request UUID with a **different newly generated signed URL** is forbidden. If state is `uncertain`, `submitting`, or outcome is unknown, first query `telegram-get-rich-send-status` with the **same UUID**, reconcile history and the original message, and NEVER blindly send again with a fresh UUID. If state is `sent` but not verified, read back the existing message instead.
- If a call is **definitively rejected** before publication, correct the cause, refresh the signed URL and use a **new UUID**. Do not claim a rejected request published successfully.
- `PHOTO_EXT_INVALID`: an opaque Google Drive signed URL lacked a filename extension. Core now normalizes the MIME-sniffed image extension before Telegram photo staging. If it recurs, verify the deployed Core build; do not work around it with a separate post.
- `IMAGE_PROCESS_FAILED`: convert the SAME PNG to an RGB JPEG, upload the JPEG, fetch a new signed raw URL; use a new UUID only after the original send is confirmed rejected. Avoid altering the original art.
- `URL_FETCH_DENIED` or an expired link: fetch a new signed link from Drive, but always reconcile any previous accepted or uncertain send before another attempt.
- ChatGPT `sandbox:/mnt/data` paths aren't remote HTTPS links and cannot be sent as URL sources. The Drive upload connector needs a real file reference. If one is missing, report the exact obstacle instead of pretending access or requesting a manual `curl` reflexively.
- `photo.source.kind:"telegram"` with `chatId:"me"` and `messageId` is a secondary path for an image **already** in Saved Messages. It does not automate transporting a fresh generated image into Telegram. Do not use it for the default Drive workflow.
- Respect the Rich write flag, exact allowed destination list, Telegram Premium capabilities and explicit user-approved content.

## Live proof

On 2026-11-21 a ChatGPT cat image went through the Drive connector automatically; an initial PNG failed, the JPEG succeeded. Saved Messages `#400627` returned `verified:true`, `photoCount:1`, `tableCount:1`. The approved channel publication at https://t.me/no_skazhu/8 returned `verified:true`, `partial:false`, `photoReferencesValid:true`, `photoCount:1`, `tableCount:1`, `unsupported:[]`, with 47 native blocks. No intermediate Saved Messages or second channel post was needed. Further details: `docs/rich-messages.md`.
