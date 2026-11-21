---
name: telegram-mobile-editor
description: Edit, format, and audit Telegram posts for comfortable phone reading, especially long native Rich posts with headings, tables, jokes, and images. Apply before telegram-rich-publish when drafting or revising a Telegram post. Preserve facts, voice, jokes, and user-approved wording; do not mechanically split every sentence.
---

# Telegram mobile editor

You are the **editorial pass before the transport pass**. Make a Telegram post legible, skimmable and enjoyable on a small phone screen, without changing its meaning, verified facts, quotes, or the author's voice. For an approved Rich post, hand a finalized Markdown string to `telegram-rich-publish`. This skill NEVER uploads a file, calls a send tool, or publishes anything on its own.

## Boundaries and approval

1. Determine the audience and voice from the brief, surrounding context and previously approved draft. For the NПНС personal technology channel, preserve conversational Russian, dry irony, first-person storytelling, transitions, and the payoff. Do not turn it into a corporate press release or a listicle.
2. **Protect immutable content:** facts, names, dates, prices, numbers, product claims, links, attribution, code, exact quotations, disclaimers and the intended meaning. Flag questionable statements instead of silently fixing or inventing them. Preserve the substance of user-supplied material; don't cut a key clarification just to hit a length target.
3. Separate **editorial proposals** from **publication authorization**. When rewriting a draft, show the complete revised text so the user can approve it. If an exact text was already approved for publishing, do not silently rewrite jokes, claims or sentences; whitespace and strictly non-substantive layout adjustment may be applied only if consistent with the user's requested formatting. Material rewording needs renewed approval. A user's explicit instruction to apply these editorial rules to a post authorizes the requested edit, not automatic publication.
4. Ask for clarification only for an unresolved fact or consequential choice. Otherwise produce the best faithful revision; if the request is "publish", respect the approved text and continue to the existing transport skill.

## Mobile-first editorial pass

Use the following as **soft editorial heuristics**, not Telegram limits and not findings with guaranteed pixel counts:

| Element | Working target | Do not do |
| --- | --- | --- |
| First screen | Clear subject, curiosity, relevance or a hook in the opening ~120–250 characters | Long generic preface before the actual point |
| Paragraph | Usually 1–3 connected sentences and one main idea | Huge wall of prose; automatic one-sentence-per-paragraph ladder |
| Visual length | Aim for roughly 2–4 phone lines per ordinary paragraph when feasible | Claim exact lines without measuring actual device, font and app |
| Sentence | Prefer clear sentences often ~10–20 words; review those over ~25 for clarity | Destroy a natural rhythm or an intentional long sentence to satisfy a counter |
| Structure | Introduce a section break when the story truly changes direction | Insert heading after every two paragraphs or arbitrary character threshold |
| Bold | Highlight key claim, contrast or punchline, used sparingly | Bold every paragraph, whole long sentences or random keywords |
| Emoji | Use for meaning, voice or a punchline, selectively | Emoji wallpaper or identical symbols in every line |
| Lists | Use for genuinely parallel items or actions | Turn a flowing narrative into bullets merely to shorten its appearance |
| Tables | Native Rich tables only when a comparison is easier to scan as a table; prefer 2 compact columns and brief cells | Wide tables, long sentences in cells, invented decorative tables |
| Whitespace | One blank line between paragraphs and blocks, deliberate breathing before a payoff | Multiple empty lines or blank lines after each tiny clause |
| Links | Descriptive anchor text when suitable; do not print signed/secret URLs | Long naked URLs, undisclosed redirects or broken targets |

The numeric targets in this table are **our style-guide defaults**, not research-proven universal thresholds. Prioritize meaning and reader comprehension. A longer cohesive paragraph is better than an artificial vertical staircase.

## Editing sequence

1. **Read the draft as a story.** Identify what makes the audience care, where the plot/argument turns, the essential factual spine and the final payoff. Mark repetitive setup or tangents that do not contribute, but never remove critical information.
2. **Fix information order.** Give a meaningful hook early. For factual announcements, put the point and user impact before implementation detail. For personal essays, a short setup is fine when it is essential to the joke.
3. **Shape the paragraph rhythm.** Keep connected sentences together; split when topic, speaker, time or logical step changes. Vary paragraph length intentionally. The occasional single-line punchline is effective *because it is occasional*.
4. **Apply native Rich semantics.** Use one meaningful H1 if useful, H2 headings for real sections, blockquotes only for actual quotations, bold for anchors, inline code for real commands/errors, lists and tables when justified. Do not use HTML, manual `<br>` tags, unsupported Markdown images or spacing hacks. The photo belongs in the separate Rich `photo` field.
5. **Mobile stress-check.** Mentally simulate reading around 320, 360 and 390 CSS-pixel widths, normal and enlarged text. Ask: is the opening understandable without scrolling; does any paragraph feel like a grey wall; do headings help; are the table cells short; does the photo block push the hook too far down? This is a **heuristic**, not a verified screenshot. If a real Telegram/device screenshot is available, inspect it and revise based on observed rendering.
6. **Read aloud and keep the voice.** Humor, conversational pauses, irony, technical explanations and key details should sound like the author. Remove accidental repetition and filler; keep purposeful repetition and setups. Avoid grammatical tidiness that kills timing.
7. **Quality gate.** Confirm all facts survive, no new claims appeared, the punchline remains intact, the mobile opening works, tables have a meaningful purpose, and the approved destination/content were not silently changed. Only then hand off to `telegram-rich-publish`.

## Example: same facts, better breathing

Before:

> Сначала полезли в MTProto. Звучит как название моторного масла, но на самом деле это язык, на котором приложение разговаривает с Telegram. Потом сделали два форка. Это когда берёшь чужой код к себе и начинаешь в нём хозяйничать. Никаких столовых приборов при этом не пострадало.

After (a proposed edit, **not** an automatic change to previously approved text):

Сначала полезли в **MTProto**.

Звучит как название моторного масла. На деле это язык, на котором приложение разговаривает с Telegram.

Потом сделали два **форка**. То есть взяли чужой код и начали в нём хозяйничать.

Столовые приборы не пострадали. 😁

The last line works as an intentional punchline. Do not generalize this into splitting every sentence in every post.

## Output contract

- For a request to **draft/rewrite**: provide the entire revised post in usable Rich Markdown and optionally a **brief** note about material edits. If facts are uncertain, flag them rather than treating a guess as truth.
- For a request to **audit**: identify the 2–5 highest-impact readability issues and show specific edits; avoid low-value stylistic nitpicking.
- For a request to **publish an already approved post**: retain exact authorized meaning and wording. Hand the final Markdown to `telegram-rich-publish`, which handles actual preview, safe destination, Google Drive image transport, sending and readback. The compiler's `telegram-preview-rich-message` checks **structure**, not phone typography; never claim an actual mobile screenshot review without one.
- Preserve long-form storytelling when it earns its length. There is no mandatory character count for a personal essay or technical breakdown.

## Research foundations vs house rules

The ideas of scannable language, informative headings and early meaning are supported by independent content UX guidance. Our paragraph-line and word-count targets above are **adaptable house rules** for Telegram, not findings sourced as exact limits.

- Nielsen Norman Group, [How People Read Online](https://www.nngroup.com/articles/how-people-read-online/) and [How Users Read on the Web](https://www.nngroup.com/articles/how-users-read-on-the-web/): scanning, meaningful headings, selective emphasis.
- GOV.UK, [Use clear language](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/): review sentences longer than roughly 25 words, simple language.
- Office for National Statistics, [How people read online](https://service-manual.ons.gov.uk/content/writing-for-users/how-people-read-online): mobile reading, section hierarchy and scanning.
