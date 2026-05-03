import { createFileRoute } from "@tanstack/react-router";
import { ProviderManager } from "@/components/settings/ProviderManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-semibold text-ink mb-6">Settings</h1>
      <Tabs value="providers">
        <TabsList>
          <TabsTrigger value="providers">AI Providers</TabsTrigger>
        </TabsList>
        <TabsContent value="providers">
          <ProviderManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
