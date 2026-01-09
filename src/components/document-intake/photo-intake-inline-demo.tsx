// src/components/document-intake/photo-intake-inline-demo.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, Table2, LayoutTemplate, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CrfE2C2 } from "@/components/forms/crf-e2-c2";
import { CrfTableView } from "@/components/forms/crf-table-view";
import {
  CRF_E2C2_SCHEMA,
  CRF_E2C2_WHITELIST_SET,
} from "@/components/forms/crf-schemas";

type CrfFieldData = { key: string; label?: string; value?: any };
type Box = {
  id: string;
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};
type Stage = "idle" | "processing" | "done" | "error";
type ViewMode = "table" | "form";

const toArray = <T,>(v: any): T[] => (Array.isArray(v) ? v : []);

const TEMPLATE_BOXES: Record<string, Omit<Box, "id" | "key" | "label">> = {
  outp_num: { x: 0.188, y: 0.158, w: 0.127, h: 0.063 },
  name_abbre: { x: 0.496, y: 0.141, w: 0.105, h: 0.074 },
  sex: { x: 0.675, y: 0.143, w: 0.1, h: 0.074 },
  nation: { x: 0.832, y: 0.194, w: 0.122, h: 0.059 },

  patient_sou: { x: 0.1, y: 0.257, w: 0.188, h: 0.059 },
  fir_diag: { x: 0.387, y: 0.257, w: 0.166, h: 0.059 },
  birth: { x: 0.686, y: 0.257, w: 0.221, h: 0.059 },

  job: { x: 0.1, y: 0.342, w: 0.796, h: 0.131 },
  hou_inco: { x: 0.177, y: 0.511, w: 0.752, h: 0.063 },

  major_payment: { x: 0.188, y: 0.616, w: 0.575, h: 0.084 },
  major_payment_other: { x: 0.719, y: 0.675, w: 0.155, h: 0.059 },

  provi: { x: 0.155, y: 0.814, w: 0.111, h: 0.046 },
  city: { x: 0.293, y: 0.814, w: 0.111, h: 0.046 },
  district: { x: 0.431, y: 0.814, w: 0.133, h: 0.046 },
  road: { x: 0.586, y: 0.814, w: 0.243, h: 0.046 },

  phone1: { x: 0.105, y: 0.886, w: 0.188, h: 0.042 },
  phone2: { x: 0.404, y: 0.886, w: 0.188, h: 0.042 },
  wechat: { x: 0.691, y: 0.886, w: 0.221, h: 0.042 },
};

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

/** ✅ 多彩颜色 */
const COLOR_POOL = [
  { border: "border-rose-500", bg: "bg-rose-500/10", glow: "ring-rose-400/60" },
  { border: "border-amber-500", bg: "bg-amber-500/10", glow: "ring-amber-400/60" },
  { border: "border-lime-500", bg: "bg-lime-500/10", glow: "ring-lime-400/60" },
  { border: "border-emerald-500", bg: "bg-emerald-500/10", glow: "ring-emerald-400/60" },
  { border: "border-cyan-500", bg: "bg-cyan-500/10", glow: "ring-cyan-400/60" },
  { border: "border-sky-500", bg: "bg-sky-500/10", glow: "ring-sky-400/60" },
  { border: "border-indigo-500", bg: "bg-indigo-500/10", glow: "ring-indigo-400/60" },
  { border: "border-fuchsia-500", bg: "bg-fuchsia-500/10", glow: "ring-fuchsia-400/60" },
];

function hashKeyToIndex(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % COLOR_POOL.length;
}

type Props = {
  crfFields?: CrfFieldData[];
  fields?: CrfFieldData[];
  data?: CrfFieldData[];
  formFields?: CrfFieldData[];
  crfData?: CrfFieldData[];

  values?: Record<string, any>;
  editValues?: Record<string, any>;

  onChange?: (key: string, value: any) => void;

  onApply?: (fields: Record<string, any>) => void;
  onApplyExtractedFields?: (fields: Record<string, any>) => void;
  applyExtractedFieldsToForm?: (fields: Record<string, any>) => void;

  preview?: React.ReactNode;
  /** ✅ renderPreview 现在接受高亮 props */
  renderPreview?: (props?: { highlightKey?: string | null; onHoverKey?: (k: string | null) => void }) => React.ReactNode;

  className?: string;
  leftPanelClassName?: string;
  rightPanelClassName?: string;

  crfCode?: string;
  eventCode?: string;

  isEditing?: boolean;

  mode?: ViewMode;
  onModeChange?: (m: ViewMode) => void;
  hideModeToggle?: boolean;
  schema?: any;
};

export function PhotoIntakeInlineDemo(props: Props) {
  const rawFields: CrfFieldData[] = useMemo(() => {
    return toArray<CrfFieldData>(
      (props as any).crfFields ??
        (props as any).formFields ??
        (props as any).fields ??
        (props as any).data ??
        (props as any).crfData
    );
  }, [props]);

  const crfFields: CrfFieldData[] = useMemo(() => {
    return rawFields.filter((f) => f?.key && CRF_E2C2_WHITELIST_SET.has(f.key));
  }, [rawFields]);

  const values = (props.values ?? props.editValues ?? {}) as Record<string, any>;
  const isEditing = props.isEditing ?? true;

  const applyCb =
    props.onApply ??
    props.onApplyExtractedFields ??
    props.applyExtractedFieldsToForm;

  const onChange =
    props.onChange ?? ((_: string, __: any) => {});

  const [stage, setStage] = useState<Stage>("idle");
  const [imgUrl, setImgUrl] = useState<string>("");
  const [imgName, setImgName] = useState<string>("");

  const [boxes, setBoxes] = useState<Box[]>([]);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const [innerMode, setInnerMode] = useState<ViewMode>("table");
  const mode: ViewMode = props.mode ?? innerMode;
  const setMode = (m: ViewMode) => {
    props.onModeChange?.(m);
    if (props.mode === undefined) setInnerMode(m);
  };

  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgRect, setImgRect] = useState({ w: 1, h: 1 });

  const schemaLabelOf = (key: string) => {
    const f = (CRF_E2C2_SCHEMA as any)?.fields?.[key];
    return f?.label || key;
  };

  const buildPreciseBoxesFromKeys = (keys: string[]) => {
    const out: Box[] = [];
    for (const key of keys || []) {
      const t = TEMPLATE_BOXES[key];
      if (!t) continue;
      out.push({
        id: `box-${key}`,
        key,
        label: schemaLabelOf(key),
        ...t,
      });
    }
    return out;
  };

  const simulateOcr = async (): Promise<Record<string, any>> => {
    return {
      outp_num: "TT002-123456",
      name_abbre: "TEST",
      sex: "女",
      nation: "汉",
      patient_sou: "门诊",
      fir_diag: "是",
      birth: "1999-12-25",
      job: "专业技术人员",
      hou_inco: "5-10万",
      major_payment: "新型农村合作医疗",
      major_payment_other: "",
      provi: "浙江",
      city: "杭州",
      district: "西湖",
      road: "灵隐",
      phone1: "18866668888",
      phone2: "16688886666",
      wechat: "a18866668888",
    };
  };

  const runOcr = async (_url?: string) => {
    const url = _url ?? imgUrl;
    if (!url) return;

    setStage("processing");
    try {
      await new Promise((r) => setTimeout(r, 700));
      const extracted = await simulateOcr();

      applyCb?.(extracted);

      const keys = (CRF_E2C2_SCHEMA as any)?.whitelistKeys || [];
      setBoxes(buildPreciseBoxesFromKeys(keys));

      setStage("done");

      /** ✅ 识别完强制切到表单模式 (Form) */
      setMode("form");

      toast.success("识别完成：已切换到表单视图");
    } catch {
      setStage("error");
      toast.error("识别失败（演示）");
    }
  };

  useEffect(() => {
    const el = imgRef.current;
    if (!el || !imgUrl) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setImgRect({ w: rect.width || 1, h: rect.height || 1 });
    };
    update();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(update);
      ro.observe(el);
    }
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [imgUrl]);

  const onPickFile = async (file: File) => {
    const url = await fileToDataURL(file);
    setImgUrl(url);
    setImgName(file.name);
    setBoxes([]);
    setHoverKey(null);
    setStage("idle");
    setMode("form"); // 初始模式
    setTimeout(() => runOcr(url), 50);
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await onPickFile(f);
    e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    await onPickFile(f);
  };

  const clearImage = () => {
    setImgUrl("");
    setImgName("");
    setBoxes([]);
    setHoverKey(null);
    setStage("idle");
  };

  const renderRightForm = () => {
    // ✅ 把 hoverKey 和 setHoverKey 传递给 renderPreview
    if (props.renderPreview) {
      return props.renderPreview({
        highlightKey: hoverKey,
        onHoverKey: setHoverKey,
      });
    }

    if (props.preview) return props.preview;

    // 默认兜底渲染
    return (
      <CrfE2C2
        data={crfFields as any}
        isEditing={isEditing}
        values={values}
        onChange={onChange}
        highlightKey={hoverKey}
        onHoverKey={setHoverKey}
      />
    );
  };

  const CrfTableAny: any = CrfTableView as any;

  return (
    <div
      className={cn(
        "h-full min-h-0 grid min-w-0 overflow-hidden",
        "grid-cols-1 xl:grid-cols-[minmax(350px,32%)_1fr]",
        props.className
      )}
    >
      {/* 左侧：图片区域 */}
      <div
        className={cn(
          "h-full min-h-0 bg-white border-r border-slate-200 flex flex-col min-w-0",
          props.leftPanelClassName
        )}
      >
        <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 px-2 whitespace-nowrap">
            拍照/文件导入
          </span>
          {imgUrl && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearImage}>
              <X className="w-3 h-3 mr-1" />
              清空
            </Button>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-3 bg-slate-50/30">
          {!imgUrl ? (
            <div
              className={cn(
                "h-full min-h-[320px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center",
                "text-slate-400 bg-slate-50/50 hover:bg-slate-50 transition-colors",
                "cursor-pointer select-none text-center px-4"
              )}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("photo-intake-file-input")?.click()}
            >
              <UploadCloud className="w-10 h-10 mb-2 opacity-60" />
              <div className="text-sm font-medium break-words">
                拖拽图片到这里 / 点击选择文件
              </div>
              <input
                id="photo-intake-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              <div className="text-xs text-slate-500 truncate">
                文件：<span className="font-mono">{imgName}</span>
              </div>
              <div className="relative w-full rounded-lg overflow-hidden border border-slate-200 bg-black/5">
                <img
                  ref={imgRef}
                  src={imgUrl}
                  alt="uploaded"
                  className="w-full h-auto block"
                  onLoad={() => {
                    const rect = imgRef.current?.getBoundingClientRect();
                    if (rect) setImgRect({ w: rect.width || 1, h: rect.height || 1 });
                  }}
                />
                {stage === "processing" && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="flex items-center gap-2 text-blue-700 text-sm font-medium">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      识别中...
                    </div>
                  </div>
                )}
                {stage === "done" && (
                  <div className="absolute inset-0 pointer-events-none">
                    {toArray(boxes).map((b) => {
                      const left = b.x * imgRect.w;
                      const top = b.y * imgRect.h;
                      const w = b.w * imgRect.w;
                      const h = b.h * imgRect.h;
                      const active = hoverKey === b.key;
                      const color = COLOR_POOL[hashKeyToIndex(b.key)];

                      return (
                        <div
                          key={b.id}
                          className={cn(
                            "absolute border-2 rounded-md transition-all",
                            "pointer-events-auto",
                            color.border,
                            color.bg,
                            active ? cn("ring-4 z-10", color.glow) : "opacity-60 hover:opacity-100"
                          )}
                          style={{ left, top, width: w, height: h }}
                          onMouseEnter={() => setHoverKey(b.key)}
                          onMouseLeave={() => setHoverKey(null)}
                          title={`${b.label} (${b.key})`}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：表格/表单 */}
      <div
        className={cn(
          "h-full min-h-0 overflow-hidden flex flex-col bg-slate-100 min-w-0",
          props.rightPanelClassName
        )}
      >
        <div className="p-2 bg-white border-b border-slate-200 shadow-sm z-10 flex items-center justify-between">
          {!props.hideModeToggle ? (
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMode("table")}
                className={cn(
                  "h-7 text-xs px-3 rounded-md transition-all",
                  mode === "table"
                    ? "bg-white shadow text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <Table2 className="w-3 h-3 mr-1.5" />
                表格视图
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMode("form")}
                className={cn(
                  "h-7 text-xs px-3 rounded-md transition-all",
                  mode === "form"
                    ? "bg-white shadow text-blue-600 font-bold"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <LayoutTemplate className="w-3 h-3 mr-1.5" />
                表单视图
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200",
                  mode === "form" ? "font-bold text-blue-700 bg-blue-50 border-blue-200" : "text-slate-500"
                )}
              >
                {mode === "table" ? "表格视图" : "表单视图"}
              </span>
            </div>
          )}
          <div className="text-xs text-slate-500 px-2">
            {stage === "processing" ? "OCR 识别中..." : stage === "done" ? "识别完成" : "等待上传"}
          </div>
        </div>

        <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {mode === "table" ? (
            <div className="h-full min-h-0 bg-white border border-slate-200 overflow-hidden relative">
              <CrfTableAny
                data={crfFields as any}
                schema={CRF_E2C2_SCHEMA}
                values={values}
                isEditing={true}
                onChange={onChange}
                highlightKey={hoverKey}
                onHoverKeyChange={setHoverKey}
                className="h-full"
                includeComputed={false}
                showKeyHint={false}
              />
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-auto p-2 sm:p-3 lg:p-3 min-w-0">
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg min-h-full min-w-0 overflow-hidden">
                <div className="p-3 sm:p-4 lg:p-4 min-w-0">
                  {renderRightForm()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}