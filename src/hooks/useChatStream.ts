import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  parts?: Array<{ type: string; text?: string }>;
}

interface UseChatStreamOptions {
  projectId: string;
  apiPath?: string;
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
}

/**
 * Hook for streaming chat with an AI backend via SSE.
 *
 * Keeps message history in React state and provides a stable `sendMessage`
 * callback. Uses a ref to avoid stale closures when reading the current
 * message list inside the streaming loop.
 */
export function useChatStream(options: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Ref that always mirrors the latest messages array. */
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
            /** Read from ref so we always send the up-to-date history. */
            messages: [...messagesRef.current, userMsg].map((m) => ({
              role: m.role,
              content: m.content,
            })),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as { content?: string };
              if (parsed.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + parsed.content }
                      : m
                  )
                );
              }
            } catch {
              /* skip malformed SSE line */
            }
          } else if (line.startsWith("event: error")) {
            const errLine = lines.find((l) => l.startsWith("data: "));
            if (errLine) {
              throw new Error(errLine.slice(6));
            }
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        /* user cancelled — no-op */
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
  }, [input, isLoading, options.projectId]);

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    sendMessage,
    append,
    stop,
  };
}
