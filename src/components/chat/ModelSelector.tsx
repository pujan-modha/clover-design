import { useState, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Eye, Zap, FileText, Sparkles, Image, Check, ChevronDown } from "lucide-react";

const ABILITY_ICONS: Record<string, React.ReactNode> = {
  reasoning: <Brain className="w-3 h-3" />,
  vision: <Eye className="w-3 h-3" />,
  function_calling: <Zap className="w-3 h-3" />,
  pdf: <FileText className="w-3 h-3" />,
  effort_control: <Sparkles className="w-3 h-3" />,
  image_generation: <Image className="w-3 h-3" />,
};

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const registry = useQuery(api.settings.getProviderRegistry);
  const [open, setOpen] = useState(false);

  const { sharedModels, customModels, selectedModelData } = useMemo(() => {
    const models = Object.values(registry?.models ?? {});
    const shared = models.filter((m: any) => !m.isCustom);
    const custom = models.filter((m: any) => m.isCustom);

    const grouped = shared.reduce<Record<string, any[]>>((acc, m: any) => {
      const provider = m.provider ?? "unknown";
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(m);
      return acc;
    }, {});

    const selected = models.find((m: any) => m.id === selectedModel);

    return { sharedModels: grouped, customModels: custom, selectedModelData: selected };
  }, [registry, selectedModel]);

  const providerNames: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setOpen(!open)}
        className="h-8 bg-secondary/70 font-normal text-xs backdrop-blur-lg sm:text-sm gap-1"
      >
        <span className="truncate max-w-[140px]">
          {(selectedModelData as any)?.name ?? "Select model"}
        </span>
        <ChevronDown className="w-3 h-3" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-stone/10 bg-cream shadow-lg overflow-hidden">
            <div className="max-h-[320px] overflow-y-auto p-1">
              {Object.entries(sharedModels).map(([provider, models]) => (
                <div key={provider} className="mb-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-stone uppercase tracking-wide">
                    {providerNames[provider] ?? provider}
                  </div>
                  {models.map((model: any) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                        model.id === selectedModel
                          ? "bg-terracotta/10 text-terracotta"
                          : "hover:bg-linen"
                      }`}
                    >
                      <span className="flex-1 text-left truncate">{model.name}</span>
                      {model.id === selectedModel && <Check className="w-3.5 h-3.5" />}
                      <div className="flex gap-0.5">
                        {model.abilities?.map((a: string) => (
                          <span key={a} className="text-stone">
                            {ABILITY_ICONS[a]}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              ))}

              {customModels.length > 0 && (
                <div className="mb-1">
                  <div className="px-2 py-1 text-[10px] font-semibold text-stone uppercase tracking-wide">
                    Custom Models
                  </div>
                  {customModels.map((model: any) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                        model.id === selectedModel
                          ? "bg-terracotta/10 text-terracotta"
                          : "hover:bg-linen"
                      }`}
                    >
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">Custom</Badge>
                      <span className="flex-1 text-left truncate">{model.name}</span>
                      {model.id === selectedModel && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}

              {Object.keys(sharedModels).length === 0 && customModels.length === 0 && (
                <div className="px-3 py-4 text-sm text-stone text-center">
                  No providers configured.
                  <br />
                  <a href="/settings" className="text-terracotta hover:underline">
                    Go to Settings
                  </a>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
