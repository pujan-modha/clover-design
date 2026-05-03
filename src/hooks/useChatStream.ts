import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
}

interface UseChatStreamOptions {
  projectId: string;
  model?: string;
  reasoningEffort?: "low" | "medium" | "high";
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  sendMessage: () => Promise<void>;
  append: (message: ChatMessage) => void;
  stop: () => void;
  currentModel: string | null;
}

/**
 * Hook for streaming chat with an AI backend via the Vercel AI SDK data stream format.
 *
 * Supports model selection, reasoning effort, and dynamic provider resolution.
 */
export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const append = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    const assistantMsgId = crypto.randomUUID();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setCurrentModel(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      const response = await fetch(
        `${convexUrl}/chat/projects/${options.projectId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: options.projectId,
            messages: [...messagesRef.current, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            model: options.model,
            reasoningEffort: options.reasoningEffort,
          }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || `HTTP ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("0:")) continue;

          try {
            const jsonStr = line.slice(2);
            const parsed = JSON.parse(jsonStr);

            if (parsed.type === "model_name") {
              setCurrentModel(parsed.content);
            } else if (parsed.type === "content") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + (parsed.chunk ?? "") }
                    : m
                )
              );
            } else if (parsed.type === "done") {
              // Stream complete
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        /* user cancelled */
      } else {
        const message = err instanceof Error ? err.message : "Failed to get response";
        setError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content || "Error: " + message }
              : m
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, options.projectId, options.model, options.reasoningEffort]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
    append,
    stop,
    currentModel,
  };
}
