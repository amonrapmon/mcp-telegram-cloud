# AGENTS.md: Cloud repository guidance

## Editorial workflow for Telegram posts

Before publishing an authored Telegram Rich post, read `skills/telegram-mobile-editor/SKILL.md` and apply its mobile-first content pass **before** `skills/telegram-rich-publish/SKILL.md`. The editor preserves agreed wording, voice, facts and the humor rhythm; it does not publish. Avoid walls of text, but never force every sentence into an isolated paragraph. Do not conflate Rich compiler success with a real mobile visual preview.

## Native Rich publishing

For tasks involving a ChatGPT-generated image plus a Telegram Rich post, **read `skills/telegram-rich-publish/SKILL.md` first**, then `docs/rich-messages.md` for technical details. This is the verified operator workflow. Do not reconstruct it from older PR discussion or propose a manual `curl` unless the Drive connector/file reference is actually unavailable.

Default route: preserve the exact image → prepare JPEG when necessary → connected Google Drive `upload_file(file_uri)` → Drive `fetch(download_raw_file:true, include_base64:false)` → use the temporary **raw** `file_uri.download_url` as Rich `photo.source.kind:"url"` → **one** `telegram-send-rich-message` → exact `telegram-get-rich-message` readback → message link. The ordinary Google Drive `/view` link is not a media URL and sharing should remain private. Never expose the signed download URL in posts, logs, docs or issues.

The old `telegram.photo.source.kind:"telegram"` path is only for an image **already in** Saved Messages, not the default delivery mechanism for a fresh ChatGPT image. Do not send the photo separately, then edit a text post.

Telegram rejected our original PNG with `IMAGE_PROCESS_FAILED`; conversion of the **same** art to JPEG was successful. Do not conclude every PNG is invalid. Core must normalize signed opaque URL image filenames to avoid `PHOTO_EXT_INVALID` before `messages.uploadMedia`.

Guard every send with exact destination approval/allowlist and the persistent UUID v4 journal. An uncertain receipt is NOT permission to repost; check existing status and message history. A fresh signed URL changes the source identity and cannot be substituted under the same UUID.

## What is actually deployed

The repository's `skills/` directory is a **plugin skill source**, not an automatically activated live skill. Its README explains packaging and installation. Source changes to the Cloud tool description require rebuilding/redeploying the Cloud and refreshing the connector's tools. A repo skill addition requires publication through the plugin skill delivery workflow before it appears in the live ChatGPT skill catalogue. Do not claim the live connector has updated from a Git commit alone.

## Verification

- 2026-11-21: Rich JPEG via Drive succeeded in Saved Messages `#400627` and channel https://t.me/no_skazhu/8, both `verified:true`, `photoCount:1`, `tableCount:1`; channel message contains 47 Rich blocks with no post-send edit.
- Before merging or deploying tool changes, run TypeScript, Core + Cloud Rich tests, parity checks and, when relevant, an allowlisted Saved Messages live test. Never publish unapproved content to a public channel.
