"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { EventMeta } from "@/types/clinical";

type VisitState = {
  structure: EventMeta[];
  loadingStructure: boolean;
  selectedEvent: string | null;
  selectedCrfCode: string | null;
  setSelectedEvent: (code: string | null) => void;
  setSelectedCrfCode: (code: string | null) => void;
};

const VisitCtx = createContext<VisitState | null>(null);

export function VisitProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [structure, setStructure] = useState<EventMeta[]>([]);
  const [loadingStructure, setLoadingStructure] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedCrfCode, setSelectedCrfCode] = useState<string | null>(null);

  // 1) 拉取 structure（只做一次）
  useEffect(() => {
    const run = async () => {
      setLoadingStructure(true);
      try {
        const sRes = await fetch("/api/structure");
        if (sRes.ok) {
          const data = await sRes.json();
          const list = Array.isArray(data) ? data : [];
          setStructure(list);
        } else {
          setStructure([]);
        }
      } catch {
        toast.error("访视结构加载失败");
        setStructure([]);
      } finally {
        setLoadingStructure(false);
      }
    };
    run();
  }, []);

  // 2) 初始化选中项：优先 URL(event/crf)，否则默认第一个 event
  useEffect(() => {
    if (loadingStructure) return;

    const urlEvent = searchParams.get("event");
    const urlCrf = searchParams.get("crf");

    const validEvent =
      urlEvent && structure.some((e) => e.event_code === urlEvent)
        ? urlEvent
        : structure[0]?.event_code ?? null;

    setSelectedEvent((prev) => prev ?? validEvent);

    if (validEvent) {
      const crfs = structure.find((e) => e.event_code === validEvent)?.crfs ?? [];
      const validCrf = urlCrf && crfs.some((c) => c.code === urlCrf) ? urlCrf : null;
      setSelectedCrfCode((prev) => prev ?? validCrf);
    } else {
      setSelectedCrfCode(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingStructure, structure.length]);

  // 3) event 切换时，若 crf 不属于该 event 则清空
  useEffect(() => {
    if (!selectedEvent || !selectedCrfCode) return;
    const crfs = structure.find((e) => e.event_code === selectedEvent)?.crfs ?? [];
    if (!crfs.some((c) => c.code === selectedCrfCode)) {
      setSelectedCrfCode(null);
    }
  }, [selectedEvent, selectedCrfCode, structure]);

  // 4) 同步到 URL（只写 event/crf，不动 patientId/layoutCollapsed 等）
  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));

    const urlEvent = current.get("event");
    const urlCrf = current.get("crf");

    const needUpdate =
      (selectedEvent && urlEvent !== selectedEvent) ||
      (!selectedEvent && !!urlEvent) ||
      (selectedCrfCode && urlCrf !== selectedCrfCode) ||
      (!selectedCrfCode && !!urlCrf);

    if (!needUpdate) return;

    if (selectedEvent) current.set("event", selectedEvent);
    else current.delete("event");

    if (selectedCrfCode) current.set("crf", selectedCrfCode);
    else current.delete("crf");

    router.push(`${pathname}?${current.toString()}`);
  }, [selectedEvent, selectedCrfCode, pathname, router, searchParams]);

  const value = useMemo<VisitState>(
    () => ({
      structure,
      loadingStructure,
      selectedEvent,
      selectedCrfCode,
      setSelectedEvent,
      setSelectedCrfCode,
    }),
    [structure, loadingStructure, selectedEvent, selectedCrfCode]
  );

  return <VisitCtx.Provider value={value}>{children}</VisitCtx.Provider>;
}

export function useVisit() {
  const ctx = useContext(VisitCtx);
  if (!ctx) throw new Error("useVisit must be used within VisitProvider");
  return ctx;
}
