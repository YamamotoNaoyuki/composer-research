import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export const MODEL = "claude-sonnet-4-20250514";
export const MAX_TOKENS = 8192;
