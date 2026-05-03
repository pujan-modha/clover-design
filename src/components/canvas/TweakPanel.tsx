import { useState, useEffect, useRef, useMemo } from "react";
import { X, SlidersHorizontal, RotateCcw } from "lucide-react";
import {
  extractTweaksFromHTML,
  parseEditmodeBlock,
  replaceEditmodeBlock,
  humanizeKey,
  isColorString,
  type TokenSchemaEntry,
} from "@/lib/tweak-parser";

type TokenValue = unknown;
type Tokens = Record<string, TokenValue>;

function ColorSwatch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative inline-flex h-7 w-7 shrink-0 overflow-hidden rounded-md shadow-sm cursor-pointer hover:scale-105 transition-transform">
        <span className="block h-full w-full" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="min-w-0 flex-1 rounded-md border border-transparent bg-gray-100 px-2 py-1.5 text-xs text-gray-900 uppercase tracking-wider hover:bg-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none font-mono"
      />
    </div>
  );
}

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

function RangeSlider({ value, min, max, step, unit, onChange }: {
  value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600"
      />
      <span className="min-w-[44px] text-right text-[11px] text-gray-500 font-mono">
        {value}{unit ?? ""}
      </span>
    </div>
  );
}

function SegmentedPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex w-full overflow-hidden rounded-md bg-gray-100 p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 truncate rounded-sm px-2 py-1 text-[11px] transition-colors ${
            opt === value ? "bg-white text-gray-900 shadow-sm font-medium" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-transparent bg-gray-100 px-2 py-1.5 text-xs text-gray-900 hover:bg-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none"
    />
  );
}

function TokenRow({
  tokenKey, value, onChange, schemaEntry,
}: {
  tokenKey: string;
  value: TokenValue;
  onChange: (v: TokenValue) => void;
  schemaEntry?: TokenSchemaEntry;
}) {
  const labelText = humanizeKey(tokenKey);

  if (schemaEntry) {
    if (schemaEntry.kind === "boolean") {
      const v = typeof value === "boolean" ? value : Boolean(value);
      return (
        <div className="flex items-center justify-between gap-3 py-1.5">
          <span className="truncate text-xs text-gray-700">{labelText}</span>
          <Switch checked={v} onChange={(next) => onChange(next)} />
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-1.5 py-1">
        <span className="text-[10px] uppercase text-gray-400 tracking-wider">{labelText}</span>
        {schemaEntry.kind === "color" ? (
          <ColorSwatch value={typeof value === "string" ? value : "#000000"} onChange={(v) => onChange(v)} />
        ) : schemaEntry.kind === "number" ? (
          <RangeSlider
            value={typeof value === "number" ? value : 0}
            min={schemaEntry.min ?? 0}
            max={schemaEntry.max ?? 100}
            step={schemaEntry.step ?? 1}
            unit={schemaEntry.unit}
            onChange={(v) => onChange(v)}
          />
        ) : schemaEntry.kind === "enum" ? (
          <SegmentedPicker
            value={typeof value === "string" ? value : (schemaEntry.options?.[0] ?? "")}
            options={schemaEntry.options ?? []}
            onChange={(v) => onChange(v)}
          />
        ) : (
          <TextInput value={typeof value === "string" ? value : ""} onChange={(v) => onChange(v)} />
        )}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div className="flex items-center justify-between gap-3 py-1.5">
        <span className="truncate text-xs text-gray-700">{labelText}</span>
        <Switch checked={value} onChange={(v) => onChange(v)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <span className="text-[10px] uppercase text-gray-400 tracking-wider">{labelText}</span>
      {isColorString(value) ? (
        <ColorSwatch value={value} onChange={(v) => onChange(v)} />
      ) : typeof value === "number" ? (
        <TextInput value={String(value)} onChange={(v) => onChange(Number(v))} />
      ) : typeof value === "string" ? (
        <TextInput value={value} onChange={(v) => onChange(v)} />
      ) : (
        <TextInput value={JSON.stringify(value)} onChange={(v) => { try { onChange(JSON.parse(v)); } catch {} }} />
      )}
    </div>
  );
}

export function TweakPanel({
  previewHtml,
  iframeRef,
  onHtmlChange,
}: {
  previewHtml: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onHtmlChange?: (html: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; baseLeft: number; baseTop: number } | null>(null);
  const justDraggedRef = useRef(false);

  const block = useMemo(() => (previewHtml ? parseEditmodeBlock(previewHtml) : null), [previewHtml]);
  const extracted = useMemo(() => (previewHtml ? extractTweaksFromHTML(previewHtml) : null), [previewHtml]);
  const schema = extracted?.schema ?? null;

  const [liveTokens, setLiveTokens] = useState<Tokens | null>(null);
  const liveSigRef = useRef<string>("");

  useEffect(() => {
    if (!block) {
      setLiveTokens(null);
      liveSigRef.current = "";
      return;
    }
    const sig = Object.keys(block.tokens).sort().join("|");
    if (sig !== liveSigRef.current) {
      setLiveTokens({ ...block.tokens });
      liveSigRef.current = sig;
    }
  }, [block]);

  const initialTokensRef = useRef<Tokens | null>(null);
  useEffect(() => {
    if (!block) {
      initialTokensRef.current = null;
      return;
    }
    const sig = Object.keys(block.tokens).sort().join("|");
    if (initialTokensRef.current === null || liveSigRef.current !== sig) {
      initialTokensRef.current = { ...block.tokens };
    }
  }, [block]);

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!previewHtml) return null;
  const entries = liveTokens ? Object.entries(liveTokens) : [];
  const hasTokens = entries.length > 0;

  function postLive(tokens: Tokens) {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "designforge:tweaks:update", tokens }, "*");
  }

  function schedulePersist(tokens: Tokens) {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      const nextHtml = replaceEditmodeBlock(previewHtml, tokens);
      onHtmlChange?.(nextHtml);
    }, 400);
  }

  function applyTokens(next: Tokens) {
    setLiveTokens(next);
    postLive(next);
    schedulePersist(next);
  }

  function applyChange(key: string, next: TokenValue) {
    if (!liveTokens) return;
    applyTokens({ ...liveTokens, [key]: next });
  }

  function reset() {
    if (initialTokensRef.current) applyTokens({ ...initialTokensRef.current });
  }

  const isDirty =
    initialTokensRef.current !== null &&
    JSON.stringify(initialTokensRef.current) !== JSON.stringify(liveTokens);

  function onDragStart(e: React.MouseEvent) {
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const parent = el.offsetParent as HTMLElement | null;
    const bounds = parent
      ? parent.getBoundingClientRect()
      : ({ left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight } as DOMRect);

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
    };
    e.preventDefault();

    let moved = false;
    const THRESHOLD = 4;

    const onMove = (ev: MouseEvent) => {
      const st = dragState.current;
      if (!st) return;
      const dx = ev.clientX - st.startX;
      const dy = ev.clientY - st.startY;
      if (!moved) {
        if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
        moved = true;
        justDraggedRef.current = true;
        document.body.style.cursor = "grabbing";
        document.body.style.userSelect = "none";
      }
      const nextLeft = Math.max(bounds.left + 8, Math.min(bounds.right - rect.width - 8, st.baseLeft + dx));
      const nextTop = Math.max(bounds.top + 8, Math.min(bounds.bottom - rect.height - 8, st.baseTop + dy));
      setPos({ left: nextLeft, top: nextTop });
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      dragState.current = null;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <div
      ref={panelRef}
      className={pos ? "fixed z-20" : "absolute right-5 top-5 z-20"}
      style={pos ? { left: pos.left, top: pos.top } : undefined}
    >
      {open ? (
        <div className="flex w-[260px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <div
              className="flex min-w-0 flex-1 items-center gap-2 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={onDragStart}
            >
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Tweaks</span>
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 font-mono">
                {hasTokens ? String(entries.length) : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} disabled={!isDirty} title="Reset" className="p-1 text-gray-400 hover:text-gray-700 rounded disabled:opacity-30">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-700 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {hasTokens ? (
            <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-3 py-2">
              {entries.map(([key, value]) => (
                <TokenRow
                  key={key}
                  tokenKey={key}
                  value={value}
                  onChange={(next) => applyChange(key, next)}
                  schemaEntry={schema?.[key]}
                />
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-gray-500">
              No tweakable parameters found. Ask Claude to add tweak controls to the design.
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onMouseDown={onDragStart}
          onClick={(e) => {
            if (justDraggedRef.current) {
              justDraggedRef.current = false;
              e.preventDefault();
              return;
            }
            setOpen(true);
          }}
          className="inline-flex h-7 cursor-grab items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-xs text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 active:scale-95 transition-all"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Tweaks</span>
          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 font-mono">
            {hasTokens ? String(entries.length) : "—"}
          </span>
        </button>
      )}
    </div>
  );
}
