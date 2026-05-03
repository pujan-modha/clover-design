import { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useChatStream } from "@/hooks/useChatStream";

interface ChatPanelProps {
  projectId: string;
}

export function ChatPanel({ projectId }: ChatPanelProps) {
  const { messages, input, setInput, isLoading, error, sendMessage, stop } =
    useChatStream({ projectId });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-stone">
              Describe what you want to build. The AI will generate designs,
              components, and code.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-terracotta text-white"
                  : "bg-linen text-ink border border-stone/10"
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.content || (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce [animation-delay:150ms]">.</span>
                    <span className="animate-bounce [animation-delay:300ms]">.</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-stone/10 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI to build something..."
          disabled={isLoading}
          className="flex-1 rounded-lg border border-stone/20 bg-parchment px-3 py-2 text-sm outline-none focus:border-terracotta/40 disabled:opacity-50"
        />
        {isLoading ? (
          <Button
            type="button"
            onClick={stop}
            variant="outline"
            className="h-9 px-3 border-stone/20"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!input.trim()}
            className="h-9 bg-terracotta hover:bg-terracotta/90 text-white disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </Button>
        )}
      </form>
    </div>
  );
}
