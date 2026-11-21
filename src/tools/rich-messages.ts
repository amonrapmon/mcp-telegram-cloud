import { z } from "zod";
import type { TelegramService } from "@overpod/mcp-telegram/service";
import type { ToolDefinition } from "../tool-registry.js";
import { READ_ONLY, CONFIRMED_WRITE_LOCAL, CONFIRMED_WRITE_PUBLIC, textResult } from "./helpers.js";

type RichOptions = {
  silent?: boolean; protectContent?: boolean; clearDraft?: boolean;
  replyTo?: number; topicId?: number; scheduleDate?: number;
  rtl?: boolean; noautolink?: boolean;
};
interface RichApi {
  previewRichMessage(markdown: string, options?: { rtl?: boolean; noautolink?: boolean }): unknown;
  getRichCapabilities(): Promise<unknown>;
  getRichMessage(chatId: string, messageId: number): Promise<unknown>;
  getRichSendStatus(requestId: string): Promise<unknown>;
  writeRichMessage(
    operation: "send" | "edit" | "draft", chatId: string, requestId: string,
    markdown: string, options?: RichOptions, messageId?: number,
  ): Promise<unknown>;
}
const rich = (telegram: TelegramService): RichApi => telegram as unknown as RichApi;

export const RICH_WRITE_FLAG = "MCP_TELEGRAM_ENABLE_RICH_WRITE";
export const RICH_ALLOWED_CHATS_FLAG = "MCP_TELEGRAM_RICH_ALLOWED_CHAT_IDS";

/** Fail closed: sending to any chat not explicitly whitelisted is rejected. */
export function assertRichWriteDestination(chatId: string, allowlist = process.env[RICH_ALLOWED_CHATS_FLAG]): void {
  const allowed = (allowlist ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(chatId.trim().toLowerCase())) {
    throw new Error("Rich destination not allowed. Configure MCP_TELEGRAM_RICH_ALLOWED_CHAT_IDS explicitly.");
  }
}
const chatId = z.string().min(1).max(256);
const markdown = z.string().min(1).max(131072).describe(
  "Text-only Rich Markdown; HTML, media, footnotes, math and nested lists unsupported.",
);
const requestId = z.string().uuid().describe("UUID v4, reuse after an uncertain result, never blindly resend.");
const messageId = z.number().int().positive().max(2147483647);
const style = { rtl: z.boolean().optional(), noautolink: z.boolean().optional() };
const sendOptions = {
  ...style,
  silent: z.boolean().optional(),
  protectContent: z.boolean().optional(),
  clearDraft: z.boolean().optional(),
  replyTo: messageId.optional(),
  topicId: messageId.optional(),
  scheduleDate: z.number().int().positive().optional(),
};

export const RICH_TOOLS: ToolDefinition[] = [
  {
    name: "telegram-preview-rich-message",
    description: "Compile Rich Markdown into native Telegram blocks, without sending.",
    inputSchema: { markdown, ...style },
    annotations: READ_ONLY,
    handler: async ({ markdown, rtl, noautolink }, { telegram }) =>
      textResult(JSON.stringify(rich(telegram).previewRichMessage(markdown, { rtl, noautolink }))),
  },
  {
    name: "telegram-rich-message-capabilities",
    description: "Read Telegram layer, account Premium and rich_message_posting capability; no changes.",
    annotations: READ_ONLY,
    handler: async (_, { telegram }) => textResult(JSON.stringify(await rich(telegram).getRichCapabilities())),
  },
  {
    name: "telegram-get-rich-message",
    description: "Read native Rich blocks from one exact message, with structured table inspection.",
    inputSchema: { chatId, messageId },
    annotations: READ_ONLY,
    handler: async ({ chatId, messageId }, { telegram }) =>
      textResult(JSON.stringify(await rich(telegram).getRichMessage(chatId, messageId))),
  },
  {
    name: "telegram-get-rich-send-status",
    description: "Check a durable Rich operation by requestId. Never resends.",
    inputSchema: { requestId },
    annotations: READ_ONLY,
    handler: async ({ requestId }, { telegram }) =>
      textResult(JSON.stringify(await rich(telegram).getRichSendStatus(requestId))),
  },
  {
    name: "telegram-send-rich-message",
    description: "Send a native MTProto Rich message once. Requires explicit env opt-in, allowlist and Telegram Premium eligibility.",
    requiresEnv: RICH_WRITE_FLAG,
    inputSchema: { chatId, requestId, markdown, ...sendOptions },
    annotations: CONFIRMED_WRITE_PUBLIC,
    handler: async ({ chatId, requestId, markdown, ...options }, { telegram }) => {
      assertRichWriteDestination(chatId);
      return textResult(JSON.stringify(await rich(telegram).writeRichMessage("send", chatId, requestId, markdown, options)));
    },
  },
  {
    name: "telegram-edit-rich-message",
    description: "Edit a specific Rich message in an allowlisted chat. Requires a unique requestId for this edit.",
    requiresEnv: RICH_WRITE_FLAG,
    inputSchema: { chatId, requestId, messageId, markdown, ...style },
    annotations: CONFIRMED_WRITE_PUBLIC,
    handler: async ({ chatId, requestId, messageId, markdown, rtl, noautolink }, { telegram }) => {
      assertRichWriteDestination(chatId);
      return textResult(JSON.stringify(
        await rich(telegram).writeRichMessage("edit", chatId, requestId, markdown, { rtl, noautolink }, messageId),
      ));
    },
  },
  {
    name: "telegram-save-rich-draft",
    description: "Save/replace a Rich draft in an allowlisted chat, requires an explicit opt-in.",
    requiresEnv: RICH_WRITE_FLAG,
    inputSchema: { chatId, requestId, markdown, ...style, replyTo: messageId.optional(), topicId: messageId.optional() },
    annotations: CONFIRMED_WRITE_LOCAL,
    handler: async ({ chatId, requestId, markdown, ...options }, { telegram }) => {
      assertRichWriteDestination(chatId);
      return textResult(JSON.stringify(await rich(telegram).writeRichMessage("draft", chatId, requestId, markdown, options)));
    },
  },
];
