import { useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Save, CheckCircle2 } from "lucide-react";
import type { UserPreferences } from "@/lib/types";
import type { GameFilter } from "@/lib/types";

const FILTER_OPTIONS: { value: GameFilter; label: string }[] = [
  { value: "all", label: "All Games" },
  { value: "owned", label: "Owned Games" },
  { value: "tracked", label: "Tracked Games" },
];

export function SettingsView({ initialPrefs }: { initialPrefs: UserPreferences }) {
  const [prefs, setPrefs] = useState<UserPreferences>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-shell flex w-full">
      <Sidebar activeHref="/settings" />
      <main className="min-w-0 flex-1 bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-3xl">
          {/* Mobile top bar */}
          <div className="-ms-4 -me-4 mbe-4 flex items-center gap-3 px-4 lg:hidden">
            <MobileSidebar activeHref="/settings" />
          </div>

          {/* Header */}
          <div className="pbe-6">
            <h2 className="text-[length:var(--text-dashboard-page-title)] font-bold text-foreground">
              Settings
            </h2>
            <p className="mbs-1 text-sm text-muted-foreground">
              Manage your dashboard preferences.
            </p>
          </div>

          {/* Dashboard defaults */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pbe-2">
              <CardTitle className="text-base font-semibold">Dashboard Defaults</CardTitle>
            </CardHeader>
            <CardContent className="pbs-0">
              <FieldGroup>
                <Field>
                  <FieldLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Default Game Filter
                  </FieldLabel>
                  <ToggleGroup
                    value={[prefs.defaultFilter]}
                    onValueChange={(value) => {
                      const next = value[0];

                      if (next) {
                        // SAFETY: ToggleGroup values are constrained to GameFilter strings via FILTER_OPTIONS.
                        setPrefs((current) => ({
                          ...current,
                          defaultFilter: next as GameFilter,
                        }));
                      }
                    }}
                    variant="outline"
                  >
                    {FILTER_OPTIONS.map((opt) => (
                      <ToggleGroupItem key={opt.value} value={opt.value} aria-label={opt.label}>
                        {opt.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save data-icon="inline-start" />
                    {saving ? "Saving..." : "Save Preferences"}
                  </Button>
                  {saved && (
                    <span className="flex items-center gap-1.5 text-sm text-green-400">
                      <CheckCircle2 data-icon="inline-start" />
                      Saved
                    </span>
                  )}
                </div>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
