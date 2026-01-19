// src/app/user/dashboard/page.tsx
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import DashboardContent from "./dashboard-content";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex items-center justify-center text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          加载中…
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
