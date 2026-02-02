// app/user/dashboard/brain-risk-view.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Patient } from "@/types/clinical";
import { Card } from "@/components/ui/card";
import { Users, Brain, ShieldAlert, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type BrainRiskStats = {
  totalPatients: number;
  vascularHighRiskPatients: number;
  strokeHistoryPatients: number;
  cognitiveRiskPatients: number;
  meta?: {
    matchedColumns?: Record<string, number>;
  };
};

export default function BrainRiskView(props: { patients: Patient[]; loadingPatients: boolean }) {
  const { loadingPatients } = props;

  const [stats, setStats] = useState<BrainRiskStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
        const res = await fetch(`${API_BASE}/api/risk/brain`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("bad response");
        const json = (await res.json()) as BrainRiskStats;
        if (alive) setStats(json);
      } catch {
        if (alive) {
          setStats({
            totalPatients: 0,
            vascularHighRiskPatients: 0,
            strokeHistoryPatients: 0,
            cognitiveRiskPatients: 0,
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const total = stats?.totalPatients ?? 0;
    const vascular = stats?.vascularHighRiskPatients ?? 0;
    const stroke = stats?.strokeHistoryPatients ?? 0;
    const cog = stats?.cognitiveRiskPatients ?? 0;

    const showLoading = loading || loadingPatients;

    return [
      { label: "受试者总数", value: showLoading ? "…" : String(total), Icon: Users, tone: "text-blue-700" },
      { label: "血管高危人群", value: showLoading ? "…" : String(vascular), Icon: ShieldAlert, tone: "text-amber-700" },
      { label: "卒中/TIA 风险", value: showLoading ? "…" : String(stroke), Icon: Activity, tone: "text-rose-700" },
      { label: "认知风险", value: showLoading ? "…" : String(cog), Icon: Brain, tone: "text-purple-700" },
    ];
  }, [stats, loading, loadingPatients]);

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-700" />
          <span className="text-sm font-semibold text-slate-800">脑疾病风险</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">{c.label}</div>
                <c.Icon className={cn("h-4 w-4", c.tone)} />
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900">{c.value}</div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
