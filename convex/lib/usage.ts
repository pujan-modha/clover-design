interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
}

/** Approximate token counts and cost for a model. */
export function estimateUsage(modelId: string, promptText: string, completionText: string): TokenUsage {
  // Very rough heuristic: ~4 chars per token for most models
  const promptTokens = Math.ceil(promptText.length / 4);
  const completionTokens = Math.ceil(completionText.length / 4);

  const pricing: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "o3-mini": { input: 1.1, output: 4.4 },
    "o4-mini": { input: 1.1, output: 4.4 },
    "claude-sonnet-4": { input: 3, output: 15 },
    "claude-opus-4": { input: 15, output: 75 },
    "claude-3-7-sonnet": { input: 3, output: 15 },
    "claude-3-5-sonnet": { input: 3, output: 15 },
    "gemini-2.5-pro": { input: 1.25, output: 10 },
    "gemini-2.5-flash": { input: 0.15, output: 0.6 },
    "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  };

  let matched = Object.keys(pricing).find((k) => modelId.includes(k));
  if (!matched) matched = "gpt-4o"; // fallback

  const rate = pricing[matched] ?? pricing["gpt-4o"];
  const costUsd = (promptTokens * rate.input + completionTokens * rate.output) / 1_000_000;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: Math.round(costUsd * 1e6) / 1e6,
  };
}
