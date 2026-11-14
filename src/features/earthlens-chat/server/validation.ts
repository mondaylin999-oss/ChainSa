import "server-only";
import { z } from "zod";
import { REGIONS } from "../regions";

export const MAX_MESSAGE_CHARS = 1000;
export const MAX_HISTORY_ITEMS = 10;
export const MAX_HISTORY_CHARS = 2000;
export const MAX_BODY_BYTES = 32 * 1024;

const regionIds = REGIONS.map((r) => r.id) as [string, ...string[]];

export const chatRequestSchema = z
  .object({
    message: z.string().trim().min(1, "Message is empty.").max(MAX_MESSAGE_CHARS, `Message is longer than ${MAX_MESSAGE_CHARS} characters.`),
    lang: z.enum(["en", "my"]).optional(),
    selectedRegionId: z.enum(regionIds).optional().or(z.literal("").transform(() => undefined)),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(MAX_HISTORY_CHARS),
        }),
      )
      .max(20)
      .optional(),
    sessionId: z.string().max(100).optional(),
    // Accepted (and ignored) so the original EarthLens chat panel can call this endpoint unchanged.
    mode: z.enum(["live", "demo"]).optional(),
  })
  .strict();

export type ValidChatRequest = z.infer<typeof chatRequestSchema>;

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
}

/** Removes control characters that have no place in a chat message. */
export function sanitizeText(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}
