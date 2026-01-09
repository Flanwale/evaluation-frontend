"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Activity, Users, FileEdit, ChevronLeft, ChevronRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { UserNav } from "@/components/user-nav";
import { cn } from "@/lib/utils";

import { VisitProvider } from "@/components/edc/visit-context";
import { VisitDirectory } from "@/components/edc/visit-directory";

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const { data: session } = authClient.useSession();
  const currentView = searchParams.get("view") || "list";

  const isLayoutCollapsed = searchParams.get("layoutCollapsed") === "true";

  const toggleLayoutCollapsed = () => {
    const newCollapsedState = !isLayoutCollapsed;
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("layoutCollapsed", newCollapsedState.toString());
    router.push(`${pathname}?${current.toString()}`);
  };

  const handleNav = (targetView: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("view", targetView);

    // 切换主导航：移除 patientId 和折叠状态回默认
    current.delete("patientId");
    current.delete("layoutCollapsed");

    // 同时清掉 event/crf
    current.delete("event");
    current.delete("crf");

    router.push(`${pathname}?${current.toString()}`);
  };

  const menuItems = [
    { label: "患者列表", icon: Users, view: "list", active: currentView === "list" },
    { label: "信息录入", icon: FileEdit, view: "detail", active: currentView === "detail" },
  ];

  return (
    <VisitProvider>
      <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
        <aside
          className={cn(
            "bg-white border-r border-slate-200 flex flex-col shadow-sm transition-all duration-300 relative z-30 flex-shrink-0",
            isLayoutCollapsed ? "w-[60px]" : "w-64"
          )}
        >
          <div className="h-16 flex items-center justify-center border-b border-slate-100 bg-gradient-to-b from-white to-slate-50">
            {isLayoutCollapsed ? (
              <Activity className="w-6 h-6 text-blue-600" />
            ) : (
              <div className="flex items-center gap-2 animate-in fade-in duration-300">
                <div className="bg-blue-600 text-white p-1 rounded-md">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-800 text-lg tracking-tight">EDC 工作台</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm z-30 hover:bg-slate-50 hover:text-blue-600"
            onClick={toggleLayoutCollapsed}
          >
            {isLayoutCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </Button>

          {/* ✅ 唯一滚动条：整个这里滚动（访视目录内部不再滚动） */}
          <div className="flex-1 py-6 px-3 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-400 px-4 mb-2 uppercase tracking-wider">
              {!isLayoutCollapsed && "主要导航"}
            </div>

            <div className="space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.view}
                  variant="ghost"
                  onClick={() => handleNav(item.view)}
                  className={cn(
                    "w-full justify-start h-11 transition-all duration-200 relative overflow-hidden",
                    item.active
                      ? "bg-blue-50 text-blue-700 font-semibold shadow-sm border border-blue-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    isLayoutCollapsed ? "px-0 justify-center" : "px-4"
                  )}
                >
                  {item.active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />}
                  <item.icon
                    className={cn(
                      "w-5 h-5 transition-transform",
                      isLayoutCollapsed ? "mr-0" : "mr-3",
                      item.active && "scale-110"
                    )}
                  />
                  {!isLayoutCollapsed && <span>{item.label}</span>}
                </Button>
              ))}
            </div>

            {/* ✅ 不再显示“信息录入/访视目录”等多余字，仅插入模块 */}
            {!isLayoutCollapsed && currentView === "detail" && <VisitDirectory />}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
            <UserNav session={session} />
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50">{children}</main>
      </div>
    </VisitProvider>
  );
}
