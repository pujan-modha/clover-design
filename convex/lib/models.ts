import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export type CoreProvider = "openai" | "anthropic" | "google";
export type ProviderProtocol = "openai" | "anthropic" | "google";

export interface ProviderConfig {
  key: string;
  endpoint?: string;
  protocol?: ProviderProtocol;
  name?: string;
}

export interface ResolvedModel {
  model: LanguageModel;
  modelId: string;
  modelName: string;
  providerId: string;
  abilities: string[];
}

/** Create an AI SDK provider instance from a provider config. */
export function createProviderInstance(
  providerId: string,
  config: ProviderConfig
): { provider: any; protocol: ProviderProtocol } {
  const protocol = config.protocol ?? (providerId as ProviderProtocol);
  const baseURL = config.endpoint?.trim() || undefined;

  switch (protocol) {
    case "openai": {
      return {
        provider: createOpenAI({
          apiKey: config.key,
          baseURL,
        }),
        protocol: "openai",
      };
    }
    case "anthropic": {
      return {
        provider: createAnthropic({
          apiKey: config.key,
          baseURL,
        }),
        protocol: "anthropic",
      };
    }
    case "google": {
      return {
        provider: createGoogleGenerativeAI({
          apiKey: config.key,
          baseURL,
        }),
        protocol: "google",
      };
    }
    default:
      throw new Error(`Unknown provider protocol: ${protocol}`);
  }
}

/** Resolve a model adapter string like "providerId:modelId" to a runnable LanguageModel. */
export function resolveModel(
  adapter: string,
  providers: Record<string, ProviderConfig>
): ResolvedModel {
  const colonIndex = adapter.indexOf(":");
  if (colonIndex === -1) {
    throw new Error(`Invalid adapter format: ${adapter}`);
  }

  const providerId = adapter.slice(0, colonIndex);
  const modelId = adapter.slice(colonIndex + 1);

  const providerConfig = providers[providerId];
  if (!providerConfig) {
    throw new Error(`Provider not found or not enabled: ${providerId}`);
  }

  const { provider } = createProviderInstance(providerId, providerConfig);
  const model = provider(modelId);

  return {
    model,
    modelId,
    modelName: modelId,
    providerId,
    abilities: [],
  };
}

/** Shared model definitions with metadata. */
export const SHARED_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", abilities: ["vision", "function_calling", "pdf"] },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", abilities: ["vision", "function_calling", "pdf"] },
  { id: "o3-mini", name: "o3 Mini", provider: "openai", abilities: ["reasoning", "function_calling", "effort_control"] },
  { id: "o4-mini", name: "o4 Mini", provider: "openai", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
  { id: "claude-opus-4", name: "Claude Opus 4", provider: "anthropic", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
  { id: "claude-3-7-sonnet", name: "Claude Sonnet 3.7", provider: "anthropic", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
  { id: "claude-3-5-sonnet", name: "Claude Sonnet 3.5", provider: "anthropic", abilities: ["vision", "function_calling", "pdf"] },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "google", abilities: ["reasoning", "vision", "function_calling", "pdf", "effort_control"] },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "google", abilities: ["vision", "function_calling", "reasoning", "pdf", "effort_control"] },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", abilities: ["vision", "function_calling", "pdf"] },
] as const;
