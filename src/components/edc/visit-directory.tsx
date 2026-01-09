"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisit } from "@/components/edc/visit-context";

export function VisitDirectory({ className }: { className?: string }) {
  const { structure, loadingStructure, selectedEvent, selectedCrfCode, setSelectedEvent, setSelectedCrfCode } =
    useVisit();

  if (loadingStructure) {
    return <div className={cn("px-3 py-2 text-xs text-slate-400", className)}>加载中...</div>;
  }

  if (!structure || structure.length === 0) {
    return <div className={cn("px-3 py-2 text-xs text-slate-400", className)}>暂无结构</div>;
  }

  const currentEvent = selectedEvent ?? structure[0].event_code;
  const currentCrfs = structure.find((e) => e.event_code === currentEvent)?.crfs ?? [];

  return (
    <div className={cn("mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden", className)}>
      {/* ✅ 不再显示“信息录入/访视目录/阶段”等重复字 */}
      <div className="flex">
        {/* 左列：Event（不滚动，让外层 sidebar 滚动） */}
        <div className="w-[78px] bg-slate-50 border-r border-slate-200">
          <div className="py-2">
            {structure.map((evt) => (
              <button
                key={evt.event_code}
                onClick={() => {
                  setSelectedEvent(evt.event_code);
                  setSelectedCrfCode(null);
                }}
                className={cn(
                  "w-full px-1 py-3 flex flex-col items-center justify-center gap-1 transition-all border-l-4 border-transparent hover:bg-white",
                  currentEvent === evt.event_code
                    ? "bg-white border-blue-600 text-blue-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-800"
                )}
                title={evt.event_name}
              >
                <span className="text-xs font-bold uppercase">{evt.event_code}</span>
                <span className="text-[10px] opacity-70 truncate max-w-full px-1">
                  {evt.event_name?.split(" ")?.[0] ?? ""}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 右列：CRFs（不滚动，让外层 sidebar 滚动） */}
        <div className="flex-1 min-w-0 bg-white">
          {/* ✅ 不再显示“选择访视”等额外字 */}
          <div className="py-1">
            {currentCrfs.map((crf) => (
              <button
                key={crf.code}
                onClick={() => setSelectedCrfCode(crf.code)}
                className={cn(
                  "w-full text-left py-2.5 px-3 text-sm flex items-start gap-2 border-l-[3px] transition-all hover:bg-slate-50 group min-w-0",
                  selectedCrfCode === crf.code
                    ? "bg-blue-50/60 border-blue-600 text-blue-700 font-medium"
                    : "border-transparent text-slate-700"
                )}
              >
                <FileText
                  className={cn(
                    "w-4 h-4 mt-0.5 flex-shrink-0 transition-colors",
                    selectedCrfCode === crf.code ? "text-blue-500" : "text-slate-300 group-hover:text-slate-400"
                  )}
                />
                <div className="flex flex-col min-w-0">
                  <span className="leading-snug text-xs">{crf.code}</span>
                  <span className="leading-tight text-[11px] opacity-80 line-clamp-2 break-words" title={crf.name}>
                    {crf.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
