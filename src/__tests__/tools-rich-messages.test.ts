process.env.ISSUER ??= "https://rich-test.invalid";
process.env.TELEGRAM_API_ID ??= "1";
process.env.TELEGRAM_API_HASH ??= "stub";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RICH_TOOLS, RICH_WRITE_FLAG, assertRichWriteDestination } from "../tools/rich-messages.js";

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
  it("fails closed for any non-allowlisted chat", () => {
    assert.throws(() => assertRichWriteDestination("@no_skazhu", ""), /not allowed/);
    assert.throws(() => assertRichWriteDestination("@other", "me,@no_skazhu"), /not allowed/);
    assert.doesNotThrow(() => assertRichWriteDestination("ME", "me,@no_skazhu"));
  });
});
