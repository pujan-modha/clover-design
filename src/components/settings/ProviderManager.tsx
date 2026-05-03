import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Eye, EyeOff, Plus, Trash2, Sparkles, Brain, Image, FileText, Zap } from "lucide-react";

const CORE_PROVIDERS = [
  { id: "openai", name: "OpenAI", description: "GPT-4o, o3, o4 series" },
  { id: "anthropic", name: "Anthropic", description: "Claude Sonnet, Opus" },
  { id: "google", name: "Google", description: "Gemini 2.5 Pro, Flash" },
] as const;

const PROTOCOLS = [
  { value: "openai", label: "OpenAI-compatible" },
  { value: "anthropic", label: "Anthropic-compatible" },
  { value: "google", label: "Google Gemini" },
] as const;

const ABILITY_OPTIONS = [
  { value: "reasoning", label: "Reasoning", icon: Brain },
  { value: "vision", label: "Vision", icon: Eye },
  { value: "function_calling", label: "Tools", icon: Zap },
  { value: "pdf", label: "PDF", icon: FileText },
  { value: "effort_control", label: "Effort", icon: Sparkles },
  { value: "image_generation", label: "Image Gen", icon: Image },
] as const;

export function ProviderManager() {
  const settings = useQuery(api.settings.getSettings);
  const updateSettings = useMutation(api.settings.updateSettings);

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newProvider, setNewProvider] = useState({
    name: "",
    endpoint: "",
    protocol: "openai" as const,
    key: "",
  });
  const [newModel, setNewModel] = useState({
    name: "",
    modelId: "",
    providerId: "",
    abilities: [] as string[],
  });

  const toggleKeyVisibility = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleCore = (providerId: string, enabled: boolean) => {
    updateSettings({
      coreProviders: {
        [providerId]: { enabled, newKey: "" },
      },
    });
  };

  const handleUpdateCoreKey = (providerId: string, key: string) => {
    if (!key.trim()) return;
    updateSettings({
      coreProviders: {
        [providerId]: { enabled: true, newKey: key },
      },
    });
  };

  const handleAddCustomProvider = () => {
    if (!newProvider.name.trim() || !newProvider.endpoint.trim() || !newProvider.key.trim()) return;
    const id = `custom-${Date.now()}`;
    updateSettings({
      customProviders: {
        [id]: {
          name: newProvider.name,
          enabled: true,
          endpoint: newProvider.endpoint,
          protocol: newProvider.protocol,
          newKey: newProvider.key,
        },
      },
    });
    setNewProvider({ name: "", endpoint: "", protocol: "openai", key: "" });
  };

  const handleDeleteCustomProvider = (id: string) => {
    updateSettings({
      customProviders: { [id]: null },
    });
  };

  const handleAddCustomModel = () => {
    if (!newModel.modelId.trim() || !newModel.providerId) return;
    const id = `model-${Date.now()}`;
    updateSettings({
      customModels: {
        [id]: {
          enabled: true,
          name: newModel.name || newModel.modelId,
          modelId: newModel.modelId,
          providerId: newModel.providerId,
          abilities: newModel.abilities as any,
        },
      },
    });
    setNewModel({ name: "", modelId: "", providerId: "", abilities: [] });
  };

  const handleDeleteCustomModel = (id: string) => {
    updateSettings({
      customModels: { [id]: null },
    });
  };

  const toggleAbility = (ability: string) => {
    setNewModel((prev) => ({
      ...prev,
      abilities: prev.abilities.includes(ability)
        ? prev.abilities.filter((a) => a !== ability)
        : [...prev.abilities, ability],
    }));
  };

  const availableProviders = [
    ...CORE_PROVIDERS.map((p) => ({ ...p, isCore: true })),
    ...Object.entries(settings?.customProviders ?? {}).map(([id, p]) => ({
      id,
      name: p.name,
      description: p.endpoint,
      isCore: false,
    })),
  ];

  return (
    <div className="space-y-8">
      {/* Core Providers */}
      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Core Providers</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {CORE_PROVIDERS.map((provider) => {
            const config = settings?.coreProviders?.[provider.id];
            const isEnabled = config?.enabled ?? false;
            const hasKey = !!config?.encryptedKey;

            return (
              <Card key={provider.id} className={isEnabled ? "border-terracotta/30" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{provider.name}</CardTitle>
                    <Badge variant={isEnabled ? "default" : "secondary"}>
                      {isEnabled ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>{provider.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`core-${provider.id}`}
                      checked={isEnabled}
                      onChange={(e) => handleToggleCore(provider.id, e.target.checked)}
                      className="rounded border-stone/30"
                    />
                    <Label htmlFor={`core-${provider.id}`} className="text-sm cursor-pointer">
                      Enable
                    </Label>
                  </div>

                  <div className="relative">
                    <Input
                      type={showKeys[provider.id] ? "text" : "password"}
                      placeholder={hasKey ? "************" : "Enter API key"}
                      className="pr-10"
                      onBlur={(e) => handleUpdateCoreKey(provider.id, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleKeyVisibility(provider.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone hover:text-ink"
                    >
                      {showKeys[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* Custom Providers */}
      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Custom Providers</h2>
        <p className="text-sm text-stone mb-4">
          Add any OpenAI-compatible, Anthropic-compatible, or Google Gemini endpoint. Perfect for MiniMax, Kimi, or self-hosted models.
        </p>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Add Custom Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  placeholder="e.g. MiniMax"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Protocol</Label>
                <select
                  value={newProvider.protocol}
                  onChange={(e) =>
                    setNewProvider((p) => ({ ...p, protocol: e.target.value as any }))
                  }
                  className="w-full rounded-md border border-stone/20 bg-parchment px-3 py-2 text-sm"
                >
                  {PROTOCOLS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Base URL</Label>
              <Input
                placeholder="https://api.minimax.io/anthropic"
                value={newProvider.endpoint}
                onChange={(e) => setNewProvider((p) => ({ ...p, endpoint: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">API Key</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={newProvider.key}
                onChange={(e) => setNewProvider((p) => ({ ...p, key: e.target.value }))}
              />
            </div>
            <Button
              onClick={handleAddCustomProvider}
              disabled={!newProvider.name || !newProvider.endpoint || !newProvider.key}
              className="bg-terracotta hover:bg-terracotta/90 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Provider
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {Object.entries(settings?.customProviders ?? {}).map(([id, provider]) => (
            <Card key={id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{provider.protocol}</Badge>
                    <div>
                      <p className="text-sm font-medium">{provider.name}</p>
                      <p className="text-xs text-stone">{provider.endpoint}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCustomProvider(id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator />

      {/* Custom Models */}
      <section>
        <h2 className="text-lg font-semibold text-ink mb-4">Custom Models</h2>
        <p className="text-sm text-stone mb-4">
          Define models that aren't in the built-in list. Link them to any configured provider.
        </p>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Add Custom Model</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Display Name</Label>
                <Input
                  placeholder="MiniMax M2.7"
                  value={newModel.name}
                  onChange={(e) => setNewModel((m) => ({ ...m, name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Model ID</Label>
                <Input
                  placeholder="MiniMax-M2.7"
                  value={newModel.modelId}
                  onChange={(e) => setNewModel((m) => ({ ...m, modelId: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Provider</Label>
              <select
                value={newModel.providerId}
                onChange={(e) => setNewModel((m) => ({ ...m, providerId: e.target.value }))}
                className="w-full rounded-md border border-stone/20 bg-parchment px-3 py-2 text-sm"
              >
                <option value="">Select provider...</option>
                {availableProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Abilities</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ABILITY_OPTIONS.map((ability) => {
                  const active = newModel.abilities.includes(ability.value);
                  const Icon = ability.icon;
                  return (
                    <button
                      key={ability.value}
                      type="button"
                      onClick={() => toggleAbility(ability.value)}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs border transition-colors ${
                        active
                          ? "bg-terracotta/10 border-terracotta/30 text-terracotta"
                          : "border-stone/20 text-stone hover:text-ink"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {ability.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <Button
              onClick={handleAddCustomModel}
              disabled={!newModel.modelId || !newModel.providerId}
              className="bg-terracotta hover:bg-terracotta/90 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Model
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {Object.entries(settings?.customModels ?? {}).map(([id, model]) => (
            <Card key={id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Custom</Badge>
                    <div>
                      <p className="text-sm font-medium">{model.name || model.modelId}</p>
                      <p className="text-xs text-stone">
                        {model.modelId} → {model.providerId}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {model.abilities.map((a) => (
                        <span key={a} className="text-[10px] px-1.5 py-0.5 rounded bg-linen text-stone border border-stone/10">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCustomModel(id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
