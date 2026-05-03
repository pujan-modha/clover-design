import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { buildSrcdoc } from "@/lib/srcdoc-builder";
import { exportCanvas } from "@/lib/export";
import { lintArtifact, formatLintResult } from "@/lib/lint-artifact";

interface CanvasProps {
  content?: string | null;
  designSystemTokens?: Record<string, any>;
  onContentChange?: (content: string) => void;
}

export function Canvas({ content, designSystemTokens, onContentChange }: CanvasProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [commentMode, setCommentMode] = useState(false);
  const [lintResult, setLintResult] = useState<string | null>(null);

  const updateIframe = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const html = content || getDefaultCanvas();
    const srcdoc = buildSrcdoc({
      html,
      designSystemTokens,
      commentBridge: true,
      tweakBridge: true,
    });

    iframe.srcdoc = srcdoc;
  }, [content, designSystemTokens]);

  useEffect(() => {
    updateIframe();
  }, [updateIframe]);

  // Toggle comment mode in iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      { type: "designforge:comments:setMode", enabled: commentMode },
      "*"
    );
  }, [commentMode]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));
  const handleReset = () => setScale(1);

  const handleExport = async (format: "html" | "pdf" | "zip") => {
    const html = content || getDefaultCanvas();
    await exportCanvas(html, { format, filename: "designforge-export" });
  };

  const handleLint = () => {
    const html = content || getDefaultCanvas();
    const result = lintArtifact(html);
    setLintResult(formatLintResult(result));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone/10">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="h-7 w-7 p-0 text-stone hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M8 11h6" />
            </svg>
          </Button>
          <span className="text-xs text-stone w-12 text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="h-7 w-7 p-0 text-stone hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-xs text-stone hover:text-ink"
          >
            Reset
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showGrid ? "bg-linen text-ink" : "text-stone hover:text-ink"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setCommentMode(!commentMode)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              commentMode ? "bg-terracotta/10 text-terracotta" : "text-stone hover:text-ink"
            }`}
          >
            Comments
          </button>
          <button
            onClick={handleLint}
            className="text-xs px-2 py-1 rounded transition-colors text-stone hover:text-ink"
          >
            Lint
          </button>
          <div className="h-4 w-px bg-stone/20" />
          <button
            onClick={() => handleExport("html")}
            className="text-xs px-2 py-1 rounded transition-colors text-stone hover:text-ink"
          >
            HTML
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="text-xs px-2 py-1 rounded transition-colors text-stone hover:text-ink"
          >
            PDF
          </button>
        </div>
      </div>

      {/* Lint result */}
      {lintResult && (
        <div className="px-4 py-2 border-b border-stone/10 bg-linen text-xs whitespace-pre-wrap font-mono">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold">Lint Result</span>
            <button onClick={() => setLintResult(null)} className="text-stone hover:text-ink">×</button>
          </div>
          {lintResult}
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 overflow-auto bg-parchment relative">
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)",
              backgroundSize: `${20 * scale}px ${20 * scale}px`,
            }}
          />
        )}
        <div
          className="min-h-full flex items-start justify-center p-8"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
        >
          <iframe
            ref={iframeRef}
            title="Canvas Preview"
            className="bg-white rounded-lg shadow-sm border border-stone/10"
            style={{ width: "1024px", minHeight: "600px" }}
            sandbox="allow-scripts"
          />
        </div>
      </div>
    </div>
  );
}

function getDefaultCanvas(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f7f4;
      color: #2a2927;
    }
    .placeholder {
      text-align: center;
      padding: 48px;
    }
    .placeholder h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: #c96442;
    }
    .placeholder p {
      font-size: 0.875rem;
      color: #8a8884;
      max-width: 320px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="placeholder">
    <h2>Canvas</h2>
    <p>Your design will render here. Ask the AI to generate something!</p>
  </div>
</body>
</html>`;
}
