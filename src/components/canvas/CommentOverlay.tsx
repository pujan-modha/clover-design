import { useState } from "react";
import { X, Send, MessageSquarePlus } from "lucide-react";
import { createPortal } from "react-dom";
import type { CommentRow, CommentRect } from "@/lib/types";

interface PinOverlayProps {
  comments: CommentRow[];
  zoom: number;
  onPinClick: (comment: CommentRow) => void;
  liveRects?: Record<string, CommentRect>;
}

function variantFor(comment: CommentRow) {
  if (comment.kind === "note") {
    return { bg: "bg-amber-200", border: "border-amber-600", text: "text-amber-900", ring: "ring-amber-600" };
  }
  if (comment.status === "applied") {
    return { bg: "bg-transparent", border: "border-green-500", text: "text-green-600", ring: "ring-green-500" };
  }
  return { bg: "bg-blue-500", border: "border-blue-500", text: "text-white", ring: "ring-blue-500" };
}

function pinStyleFromRect(rect: CommentRect, zoom: number) {
  const scale = zoom / 100;
  const top = rect.top * scale - 10;
  const left = rect.left * scale + rect.width * scale - 10;
  return { top: `${top}px`, left: `${left}px` };
}

export function PinOverlay({ comments, zoom, onPinClick, liveRects }: PinOverlayProps) {
  if (comments.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      {comments.map((comment, index) => {
        const v = variantFor(comment);
        const rect = liveRects?.[comment.selector] ?? comment.rect;
        const pos = pinStyleFromRect(rect, zoom);
        return (
          <button
            key={comment._id}
            title={comment.text}
            onClick={() => onPinClick(comment)}
            style={pos}
            className={`pointer-events-auto absolute flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] text-[10px] font-semibold leading-none shadow-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 ${v.bg} ${v.border} ${v.text} ${v.ring}`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );
}

export interface CommentBubbleProps {
  comment: CommentRow;
  zoom: number;
  onClose: () => void;
  onSendToClaude: (text: string) => void;
  onDelete: () => void;
}

export function CommentBubble({ comment, zoom, onClose, onSendToClaude, onDelete }: CommentBubbleProps) {
  const [draft, setDraft] = useState(comment.text || "");

  const scale = zoom / 100;
  const anchorTop = Math.max(comment.rect.top * scale + comment.rect.height * scale + 8, 12);
  const anchorLeft = Math.max(comment.rect.left * scale, 12);

  const tagPreview = (() => {
    const match = comment.outerHTML.match(/^<(\w+)([^>]{0,60})/);
    if (!match) return `<${comment.tag}>`;
    const attrs = match[2]?.trim();
    return attrs ? `<${match[1]} ${attrs}\u2026>` : `<${match[1]}>`;
  })();

  return createPortal(
    <div
      className="fixed z-[60] w-[min(320px,88vw)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
      style={{ top: `${anchorTop}px`, left: `${anchorLeft}px` }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <span className="font-mono text-[11px] text-gray-500 truncate" title={comment.outerHTML.slice(0, 200)}>
          {tagPreview}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete">
            <X className="w-3.5 h-3.5" />
          </button>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (draft.trim()) onSendToClaude(draft.trim());
              }
            }}
            placeholder="Ask Claude to edit this element..."
            rows={2}
            className="block w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 pr-10 text-[13px] leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <button
            onClick={() => draft.trim() && onSendToClaude(draft.trim())}
            disabled={!draft.trim()}
            className="absolute right-2 bottom-2 rounded-lg bg-blue-600 p-1.5 text-white shadow-sm hover:bg-blue-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {["make bigger", "change color", "more spacing", "tighter", "center it"].map((q) => (
            <button
              key={q}
              onClick={() => onSendToClaude(q)}
              className="px-2 py-1 rounded-full bg-gray-100 text-[11px] text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CommentsToolbar({
  commentMode,
  onToggle,
  count,
}: {
  commentMode: boolean;
  onToggle: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        commentMode
          ? "bg-blue-600 text-white"
          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
      }`}
      title="Toggle comment mode"
    >
      <MessageSquarePlus className="w-3.5 h-3.5" />
      <span>Comment</span>
      {count > 0 && (
        <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${commentMode ? "bg-blue-500" : "bg-gray-200"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
