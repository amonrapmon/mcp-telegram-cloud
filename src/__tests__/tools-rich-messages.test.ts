process.env.ISSUER ??= "https://rich-test.invalid";
process.env.TELEGRAM_API_ID ??= "1";
process.env.TELEGRAM_API_HASH ??= "stub";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { z } from "zod";
import { RICH_TOOLS, RICH_WRITE_FLAG, assertRichWriteDestination, assertMatchingPhotoReceipt, richJournalDirectory, richWriteResult } from "../tools/rich-messages.js";

describe("Rich tool registration", () => {
  it("exposes seven intentional tools", () => {
    assert.deepEqual(RICH_TOOLS.map((tool) => tool.name), [
      "telegram-preview-rich-message",
      "telegram-rich-message-capabilities",
      "telegram-get-rich-message",
      "telegram-get-rich-send-status",
      "telegram-send-rich-message",
      "telegram-edit-rich-message",
      "telegram-save-rich-draft",
    ]);
  });
  it("accepts an inline image source without creating a second publishing tool", () => {
    const send = RICH_TOOLS.find((tool) => tool.name === "telegram-send-rich-message");
    assert.ok(send);
    const schema = z.object(send.inputSchema ?? {});
    const basic = {
      chatId: "@no_skazhu", requestId: "6b63c546-510d-4283-99c9-9376a627eb02",
      markdown: "# Царь\n\nТекст",
    };
    assert.ok(schema.safeParse(basic).success);
    assert.ok(schema.safeParse({
      ...basic, photo: { source: { kind: "url", url: "https://example.org/cat.png" }, placement: "before" },
    }).success);
    assert.ok(schema.safeParse({
      ...basic, photo: { source: { kind: "upload", uploadId: "upl_1" }, caption: "Моя коробка!" },
    }).success);
    assert.equal(schema.safeParse({
      ...basic, photo: { source: { kind: "url", url: "not-a-url" } },
    }).success, false);
    assert.equal(schema.safeParse({
      ...basic, photo: { source: { kind: "upload", uploadId: "upl_1" }, caption: "x".repeat(1025) },
    }).success, false);
  });
  it("returns a prior receipt only for the same rich text, image and flags", () => {
    const markdown = "# Царь";
    const source = { kind: "url" as const, url: "https://example.org/cat.png" };
    const descriptor = { identity: "url:https://example.org/cat.png", caption: "", placement: "before" };
    const sha = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
    const receipt = {
      contentHash: sha({ markdown, photoIdentity: descriptor.identity }),
      optionsHash: sha({ operation: "send", options: { silent: true }, photo: descriptor }),
      state: "sent",
    };
    assert.equal(assertMatchingPhotoReceipt(receipt, markdown, source, undefined, undefined, { silent: true }), receipt);
    assert.throws(() => assertMatchingPhotoReceipt(receipt, markdown, source, undefined, undefined, { silent: false }), /another/);
    assert.throws(() => assertMatchingPhotoReceipt(receipt, markdown, { kind: "url", url: "https://example.org/other.png" }, undefined, undefined, { silent: true }), /another/);
  });
  it("gates all writing tools and leaves reads available", () => {
    RICH_TOOLS.slice(0, 4).forEach((tool) => {
      assert.equal(tool.requiresEnv, undefined);
      assert.equal(tool.annotations.readOnlyHint, true);
    });
    RICH_TOOLS.slice(4).forEach((tool) => {
      assert.equal(tool.requiresEnv, RICH_WRITE_FLAG);
      assert.equal(tool.annotations.readOnlyHint, false);
    });
  });
  it("returns ambiguous and rejected write receipts as errors", () => {
    for (const state of ["uncertain", "submitting", "rejected"]) {
      const result = richWriteResult({ state, requestId: "test" });
      assert.equal(result.isError, true);
    }
    assert.equal(richWriteResult({ state: "sent" }).isError, undefined);
  });
  it("keeps operation journal namespaces stable and isolated", () => {
    const first = richJournalDirectory("alice", 0);
    assert.equal(first, richJournalDirectory("alice", 0));
    assert.notEqual(first, richJournalDirectory("bob", 0));
    assert.notEqual(first, richJournalDirectory("alice", 1));
    assert.throws(() => richJournalDirectory(undefined, 0), /OAuth user/);
  });
  it("fails closed for any non-allowlisted chat", () => {
    assert.throws(() => assertRichWriteDestination("@no_skazhu", ""), /not allowed/);
    assert.throws(() => assertRichWriteDestination("@other", "me,@no_skazhu"), /not allowed/);
    assert.doesNotThrow(() => assertRichWriteDestination("ME", "me,@no_skazhu"));
  });
});
