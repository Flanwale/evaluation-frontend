"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  FolderOpen,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Brackets,
  Code2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { CrfFieldData } from "@/types/clinical";

type ParseMode = "fast" | "balanced" | "accurate";
type Stage = "select" | "parsing" | "result";

type ParsedBlock = {
  type: "SECTIONHEADER" | "TEXT" | "TABLE" | "OTHER";
  text?: string;
  // 可选：如果你后端能给 bbox（归一化 0~1），Segment 页可直接做框选 overlay
  bbox?: { x: number; y: number; w: number; h: number };
};

type ParsedPage = {
  pageNo: number;
  // 允许后端返回 dataURL 或可访问的 URL
  imageUrl?: string;
};

type IntakeResponse = {
  extracted_fields?: Record<string, any>;
  pages?: ParsedPage[];
  blocks?: ParsedBlock[];
  raw_json?: any;
  html?: string;
  markdown?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function prettyJson(obj: any) {
  try {
    return JSON.stringify(obj ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function extOk(file: File) {
  const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  return ok.includes(file.type);
}

function makeMock(files: File[]): IntakeResponse {
  // 兜底：让 UI 可跑、可演示
  const name = files?.[0]?.name ?? "uploaded.png";
  return {
    extracted_fields: {
      patient_id: "AUTO-" + name.replace(/\W/g, "").slice(0, 6),
      name: "（示例）张三",
      sex: "男",
      phone: "13800000000",
    },
    pages: [
      {
        pageNo: 0,
        imageUrl: URL.createObjectURL(files[0]),
      },
    ],
    blocks: [
      { type: "SECTIONHEADER", text: "1.1 人口学信息" },
      { type: "TEXT", text: "患者ID：……（示例）" },
      { type: "TEXT", text: "姓名：……（示例）" },
      { type: "TEXT", text: "性别：……（示例）" },
      { type: "SECTIONHEADER", text: "1.2 通讯及联系方式" },
      { type: "TEXT", text: "联系手机：……（示例）" },
    ],
    raw_json: { note: "mock response (backend not available)" },
    html: `<h3>1.1 人口学信息</h3><p>患者ID……</p><p>姓名……</p><p>性别……</p>`,
    markdown: `### 1.1 人口学信息\n- 患者ID：...\n- 姓名：...\n- 性别：...\n\n### 1.2 通讯及联系方式\n- 联系手机：...`,
  };
}

export function PhotoIntakeModal({
  open,
  onOpenChange,
  crfFields,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  crfFields: CrfFieldData[];
  onApply: (fields: Record<string, any>) => void;
}) {
  const [stage, setStage] = useState<Stage>("select");
  const [mode, setMode] = useState<ParseMode>("balanced");
  const [files, setFiles] = useState<File[]>([]);
  const [urlInput, setUrlInput] = useState("");

  // progress
  const [stepIndex, setStepIndex] = useState(0); // 0~3
  const steps = useMemo(
    () => ["Uploading Document", "Parsing Document", "Rendering Thumbnails", "Processing Complete"],
    []
  );

  // result
  const [resp, setResp] = useState<IntakeResponse | null>(null);
  const [tabTop, setTabTop] = useState<"Parse" | "Segment" | "Extract">("Parse");
  const [tabRight, setTabRight] = useState<"Blocks" | "JSON" | "HTML" | "Markdown">("Blocks");
  const [renderHtml, setRenderHtml] = useState(true);
  const [pageIdx, setPageIdx] = useState(0);
  const [showThumbs, setShowThumbs] = useState(false);

  // Extract 选择
  const [checkedKeys, setCheckedKeys] = useState<Record<string, boolean>>({});
  const allowedKeySet = useMemo(() => new Set(crfFields.map((f) => f.key)), [crfFields]);

  // refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  const pages = resp?.pages ?? [];
  const blocks = resp?.blocks ?? [];
  const extracted = resp?.extracted_fields ?? {};

  // 关闭时清理状态（避免下次打开看到旧内容）
  useEffect(() => {
    if (!open) {
      setStage("select");
      setMode("balanced");
      setFiles([]);
      setUrlInput("");
      setStepIndex(0);
      setResp(null);
      setTabTop("Parse");
      setTabRight("Blocks");
      setRenderHtml(true);
      setPageIdx(0);
      setShowThumbs(false);
      setCheckedKeys({});
    }
  }, [open]);

  // 支持粘贴图片
  useEffect(() => {
    if (!open) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items?.length) return;

      const pasted: File[] = [];
      for (const it of items) {
        if (it.kind === "file") {
          const f = it.getAsFile();
          if (f && extOk(f)) pasted.push(f);
        }
      }
      if (pasted.length > 0) {
        setFiles((prev) => [...prev, ...pasted]);
        toast.success(`已粘贴导入 ${pasted.length} 张图片`);
      }
    };

    window.addEventListener("paste", onPaste as any);
    return () => window.removeEventListener("paste", onPaste as any);
  }, [open]);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    const arr = Array.from(incoming).filter(extOk);
    if (arr.length === 0) {
      toast.error("只支持 PNG/JPEG/WEBP 图片");
      return;
    }
    setFiles((prev) => [...prev, ...arr]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const parseFromUrl = async () => {
    const url = urlInput.trim();
    if (!url) return toast.error("请输入图片 URL");
    setStage("parsing");
    setStepIndex(0);

    try {
      // 轻量：后端可支持 url 方式
      setStepIndex(0);
      await sleep(300);

      setStepIndex(1);
      const res = await fetch("http://localhost:8000/api/document/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, url }),
      });
      let json: IntakeResponse | null = null;
      if (res.ok) json = await res.json();

      setStepIndex(2);
      await sleep(300);

      setStepIndex(3);

      if (!json) {
        toast.error("解析失败：后端无响应（已用 mock 结果展示 UI）");
        json = makeMock([new File([], "from_url.png")]);
      }
      setResp(json);

      // 默认全选“可写回字段”
      const ck: Record<string, boolean> = {};
      Object.keys(json.extracted_fields || {}).forEach((k) => {
        ck[k] = allowedKeySet.has(k);
      });
      setCheckedKeys(ck);

      setStage("result");
    } catch (e) {
      toast.error("解析失败：网络错误（已用 mock 结果展示 UI）");
      const mock = makeMock([new File([], "from_url.png")]);
      setResp(mock);
      const ck: Record<string, boolean> = {};
      Object.keys(mock.extracted_fields || {}).forEach((k) => {
        ck[k] = allowedKeySet.has(k);
      });
      setCheckedKeys(ck);
      setStage("result");
    }
  };

  const parseFromFiles = async () => {
    if (files.length === 0) return toast.error("请先导入图片");
    setStage("parsing");
    setStepIndex(0);

    // 这套 step 是为了做出“图2”那种过程反馈（没有 SSE 也能有体验）
    try {
      setStepIndex(0);
      await sleep(250);

      setStepIndex(1);
      const form = new FormData();
      form.append("mode", mode);
      files.forEach((f) => form.append("files", f));

      const res = await fetch("http://localhost:8000/api/document/intake", {
        method: "POST",
        body: form,
      });

      let json: IntakeResponse | null = null;
      if (res.ok) {
        json = await res.json();
      }

      setStepIndex(2);
      await sleep(350);

      setStepIndex(3);

      if (!json) {
        toast.error("解析失败：后端无响应（已用 mock 结果展示 UI）");
        json = makeMock(files);
      }

      setResp(json);

      // 默认全选“可写回字段”
      const ck: Record<string, boolean> = {};
      Object.keys(json.extracted_fields || {}).forEach((k) => {
        ck[k] = allowedKeySet.has(k);
      });
      setCheckedKeys(ck);

      setStage("result");
    } catch (e) {
      toast.error("解析失败：网络错误（已用 mock 结果展示 UI）");
      const mock = makeMock(files);
      setResp(mock);
      const ck: Record<string, boolean> = {};
      Object.keys(mock.extracted_fields || {}).forEach((k) => {
        ck[k] = allowedKeySet.has(k);
      });
      setCheckedKeys(ck);
      setStage("result");
    }
  };

  const progressPct = useMemo(() => {
    // 0->20, 1->55, 2->80, 3->100
    return [20, 55, 80, 100][stepIndex] ?? 20;
  }, [stepIndex]);

  const currentPage = pages[pageIdx];

  const applyToForm = () => {
    const picked: Record<string, any> = {};
    Object.entries(extracted).forEach(([k, v]) => {
      if (checkedKeys[k]) picked[k] = v;
    });
    if (Object.keys(picked).length === 0) {
      toast.error("请选择至少一个要写回表格的字段");
      return;
    }
    onApply(picked);
    onOpenChange(false);
  };

  const toggleAllMatch = (v: boolean) => {
    const next: Record<string, boolean> = { ...checkedKeys };
    Object.keys(extracted).forEach((k) => {
      if (allowedKeySet.has(k)) next[k] = v;
    });
    setCheckedKeys(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[96vw] h-[88vh] p-0 overflow-hidden">
        {/* 顶部栏 */}
        <div className="h-12 px-4 flex items-center justify-between border-b bg-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-slate-800">拍照录入</span>
            <span className="text-xs text-slate-400 truncate">
              支持：拖拽 / 粘贴 / 选文件 / 选文件夹（Chrome）
            </span>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 主体 */}
        <div className="h-[calc(88vh-48px)] bg-slate-50">
          {stage === "select" && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 p-4">
              {/* 左：导入区（图1风格） */}
              <div
                className={cn(
                  "h-full rounded-xl border border-dashed border-slate-300 bg-white",
                  "flex flex-col items-center justify-center p-6",
                  "hover:border-blue-400 transition-colors"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
              >
                <div className="w-full max-w-[560px]">
                  <div className="flex items-center justify-center mb-6">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <ImagePlus className="w-7 h-7 text-slate-600" />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-800">
                      Drag and drop your image here
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      或{" "}
                      <button
                        className="underline text-blue-600"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        click to browse
                      </button>{" "}
                      / 直接 Ctrl+V 粘贴
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <ImagePlus className="w-4 h-4 mr-2" />
                      选择图片
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => folderInputRef.current?.click()}
                      title="仅 Chromium 支持 webkitdirectory"
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      选择文件夹
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(e.target.files)}
                    />

                    {/* @ts-ignore */}
                    <input
                      ref={folderInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      // @ts-ignore
                      webkitdirectory="true"
                      // @ts-ignore
                      directory="true"
                      accept="image/*"
                      onChange={(e) => addFiles(e.target.files)}
                    />
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="Enter a file URL (e.g., https://example.com/a.png)"
                      className="bg-white"
                    />
                    <Button variant="outline" onClick={parseFromUrl} disabled={!urlInput.trim()}>
                      Use URL
                    </Button>
                  </div>

                  <div className="mt-6 text-xs text-slate-500">
                    Supported images: PNG / JPEG / WEBP
                  </div>
                </div>
              </div>

              {/* 右：解析设置 + 文件列表 */}
              <div className="h-full rounded-xl border bg-white p-4 flex flex-col overflow-hidden">
                <div className="text-sm font-semibold text-slate-800">Parse Settings</div>
                <div className="text-xs text-slate-500 mt-1">
                  不同模式影响速度/精度（前端仅 UI；后端可按 mode 调参）
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <ModeCard title="Fast" desc="Lowest latency, great for real-time use cases." active={mode === "fast"} onClick={() => setMode("fast")} />
                  <ModeCard title="Balanced" desc="Balanced accuracy and latency, works well with most documents." active={mode === "balanced"} onClick={() => setMode("balanced")} />
                  <ModeCard title="Accurate" desc="Highest accuracy and latency. Good on the most complex documents." active={mode === "accurate"} onClick={() => setMode("accurate")} />
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-800">已导入</div>
                  <div className="text-xs text-slate-500">{files.length} 张</div>
                </div>

                <div className="mt-2 flex-1 overflow-auto rounded-lg border bg-slate-50">
                  {files.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      还没有导入图片
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      {files.map((f, idx) => (
                        <div
                          key={`${f.name}-${idx}`}
                          className="flex items-center justify-between gap-2 bg-white border rounded-lg px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="text-sm text-slate-800 truncate">{f.name}</div>
                            <div className="text-xs text-slate-500">
                              {(f.size / 1024).toFixed(1)} KB · {f.type || "image"}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => removeFile(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={files.length === 0}
                    onClick={parseFromFiles}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    开始分割/解析（开始录入）
                  </Button>
                  <div className="text-[11px] text-slate-500 mt-2">
                    点击后会显示“Uploading → Parsing → Thumbnails → Complete”的过程状态（图2风格）。
                  </div>
                </div>
              </div>
            </div>
          )}

          {stage === "parsing" && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-4 p-4">
              {/* 左：过程步骤（图2左侧） */}
              <div className="h-full rounded-xl border bg-white p-6 flex items-center justify-center">
                <div className="w-full max-w-[420px]">
                  <div className="text-lg font-semibold text-slate-800 mb-4">Processing...</div>

                  <div className="space-y-3">
                    {steps.map((s, i) => (
                      <div key={s} className="flex items-center gap-3">
                        {i < stepIndex ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : i === stepIndex ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-300" />
                        )}
                        <div className="text-sm text-slate-700">{s}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{progressPct}%</div>
                  </div>

                  <div className="mt-6 text-xs text-slate-500">
                    若你的后端支持更细 progress（SSE/WebSocket），这里可以无缝升级为实时进度。
                  </div>
                </div>
              </div>

              {/* 右：解析策略提示（图2右侧简化版） */}
              <div className="h-full rounded-xl border bg-white p-6 overflow-auto">
                <div className="text-sm font-semibold text-slate-800">Parse</div>
                <div className="text-xs text-slate-500 mt-1">
                  Mode: <span className="font-mono">{mode}</span>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3">
                  <HintCard title="Fast" active={mode === "fast"} desc="适合快速录入/低延迟" />
                  <HintCard title="Balanced" active={mode === "balanced"} desc="通用默认推荐" />
                  <HintCard title="Accurate" active={mode === "accurate"} desc="复杂表格/模糊图片" />
                </div>

                <div className="mt-8 text-xs text-slate-500">
                  你给的“图2”是 Forge Playground 的效果：左侧展示过程，右侧展示模式选择与说明。这里做了同类体验。
                </div>
              </div>
            </div>
          )}

          {stage === "result" && (
            <div className="h-full flex flex-col">
              {/* 顶部：Parse / Segment / Extract */}
              <div className="h-12 px-4 border-b bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TopTab active={tabTop === "Parse"} onClick={() => setTabTop("Parse")} label="Parse" />
                  <TopTab active={tabTop === "Segment"} onClick={() => setTabTop("Segment")} label="Segment" />
                  <TopTab active={tabTop === "Extract"} onClick={() => setTabTop("Extract")} label="Extract" />
                </div>

                <div className="flex items-center gap-2">
                  {tabTop === "Parse" && (
                    <Button variant="outline" size="sm" onClick={() => setShowThumbs((v) => !v)}>
                      {showThumbs ? "Hide Thumbnails" : "Show Thumbnails"}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setStage("select")}>
                    重新导入
                  </Button>
                </div>
              </div>

              {/* 内容区：左图右结果（图3风格） */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-0 min-w-0">
                {/* 左：页面预览 */}
                <div className="h-full border-r bg-white overflow-hidden flex flex-col min-w-0">
                  <div className="h-11 px-3 border-b flex items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="font-semibold">Page</span>
                      <span className="font-mono">{pageIdx}</span>
                      <span className="text-slate-400">/</span>
                      <span className="font-mono">{Math.max(0, pages.length - 1)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
                        disabled={pageIdx <= 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Prev
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPageIdx((p) => Math.min(Math.max(0, pages.length - 1), p + 1))}
                        disabled={pageIdx >= pages.length - 1}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-3 bg-white">
                    {currentPage?.imageUrl ? (
                      <div className="rounded-lg border bg-white overflow-hidden">
                        {/* Segment: 可叠加 bbox overlay，这里先保留容器 */}
                        <div className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={currentPage.imageUrl}
                            alt={`page-${currentPage.pageNo}`}
                            className="w-full h-auto block"
                          />
                          {tabTop === "Segment" && (
                            <Overlay blocks={blocks} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        暂无页面预览（后端可返回 pages[].imageUrl）
                      </div>
                    )}
                  </div>

                  {tabTop === "Parse" && showThumbs && pages.length > 1 && (
                    <div className="h-24 border-t bg-slate-50 overflow-auto">
                      <div className="p-2 flex gap-2">
                        {pages.map((p, i) => (
                          <button
                            key={p.pageNo}
                            onClick={() => setPageIdx(i)}
                            className={cn(
                              "w-20 h-20 rounded-md border overflow-hidden bg-white flex-shrink-0",
                              i === pageIdx ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200"
                            )}
                            title={`Page ${i}`}
                          >
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                                {i}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 右：结果面板 */}
                <div className="h-full bg-white overflow-hidden flex flex-col min-w-0">
                  {/* Parse 右侧 tab（Blocks/JSON/HTML/Markdown） */}
                  {tabTop !== "Extract" && (
                    <div className="h-11 px-3 border-b bg-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <RightTab
                          active={tabRight === "Blocks"}
                          onClick={() => setTabRight("Blocks")}
                          icon={<FileText className="w-4 h-4" />}
                          label="Blocks"
                        />
                        <RightTab
                          active={tabRight === "JSON"}
                          onClick={() => setTabRight("JSON")}
                          icon={<Brackets className="w-4 h-4" />}
                          label="JSON"
                        />
                        <RightTab
                          active={tabRight === "HTML"}
                          onClick={() => setTabRight("HTML")}
                          icon={<Code2 className="w-4 h-4" />}
                          label="HTML"
                        />
                        <RightTab
                          active={tabRight === "Markdown"}
                          onClick={() => setTabRight("Markdown")}
                          icon={<FileText className="w-4 h-4" />}
                          label="Markdown"
                        />
                      </div>

                      {tabRight === "HTML" && (
                        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={renderHtml}
                            onChange={(e) => setRenderHtml(e.target.checked)}
                          />
                          Render HTML
                        </label>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-auto">
                    {tabTop === "Parse" || tabTop === "Segment" ? (
                      <div className="p-3">
                        {tabRight === "Blocks" && (
                          <div className="space-y-3">
                            {blocks.length === 0 ? (
                              <EmptyState title="暂无 blocks" desc="后端可返回 blocks 列表（SECTIONHEADER/TEXT/...）" />
                            ) : (
                              blocks.map((b, idx) => (
                                <BlockItem key={idx} block={b} />
                              ))
                            )}
                          </div>
                        )}

                        {tabRight === "JSON" && (
                          <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto">
                            {prettyJson(resp?.raw_json ?? resp)}
                          </pre>
                        )}

                        {tabRight === "HTML" && (
                          <div className="border rounded-lg overflow-hidden">
                            {renderHtml ? (
                              <div
                                className="p-4 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: resp?.html || "<p>(empty)</p>" }}
                              />
                            ) : (
                              <pre className="text-xs bg-slate-50 p-3 overflow-auto">
                                {resp?.html || ""}
                              </pre>
                            )}
                          </div>
                        )}

                        {tabRight === "Markdown" && (
                          <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto">
                            {resp?.markdown || ""}
                          </pre>
                        )}

                        {tabTop === "Segment" && (
                          <div className="mt-4">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <AlertTriangle className="w-4 h-4" />
                              Segment 视图会在左侧图片上叠加框选（需后端 blocks[].bbox）
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Extract
                      <div className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-800">识别字段（可一键写回表格）</div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleAllMatch(true)}>
                              全选可匹配
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => toggleAllMatch(false)}>
                              取消全选
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={applyToForm}
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              写回表格
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-slate-500">
                          只会默认勾选“key 能匹配当前 CRF 字段”的条目；不匹配的字段会显示为灰色（避免写错表）。
                        </div>

                        <div className="mt-3 border rounded-lg overflow-hidden">
                          {Object.keys(extracted).length === 0 ? (
                            <div className="p-6 text-center text-slate-400">
                              未提取到字段（后端请返回 extracted_fields）
                            </div>
                          ) : (
                            <div className="divide-y">
                              {Object.entries(extracted).map(([k, v]) => {
                                const match = allowedKeySet.has(k);
                                const checked = !!checkedKeys[k];
                                return (
                                  <div
                                    key={k}
                                    className={cn(
                                      "p-3 flex items-start gap-3",
                                      !match ? "bg-slate-50" : "bg-white"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        setCheckedKeys((prev) => ({ ...prev, [k]: e.target.checked }))
                                      }
                                      disabled={!match}
                                      className="mt-1"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-slate-800">{k}</span>
                                        {!match ? (
                                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-600">
                                            未匹配当前表单
                                          </span>
                                        ) : (
                                          <span className="text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-700">
                                            可写回
                                          </span>
                                        )}
                                      </div>

                                      <Input
                                        value={String(v ?? "")}
                                        onChange={(e) => {
                                          const nv = e.target.value;
                                          // 允许在写回前手动改一下
                                          if (!resp) return;
                                          setResp((prev) => ({
                                            ...(prev || {}),
                                            extracted_fields: {
                                              ...(prev?.extracted_fields || {}),
                                              [k]: nv,
                                            },
                                          }));
                                        }}
                                        className={cn("mt-2", !match && "opacity-70")}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                          提示：如果你后端输出的 key 和前端 CRF key 不一致，建议在后端加一层字段映射（或在这里加映射表）。
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- UI small components ---------------- */

function ModeCard({
  title,
  desc,
  active,
  onClick,
}: {
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-xl border p-4 transition-all",
        active ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50" : "border-slate-200 hover:border-slate-300"
      )}
    >
      <div className="font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-500 mt-1 leading-relaxed">{desc}</div>
    </button>
  );
}

function HintCard({ title, desc, active }: { title: string; desc: string; active: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        active ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
      )}
    >
      <div className="font-semibold text-slate-800">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </div>
  );
}

function TopTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-sm transition-colors",
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {label}
    </button>
  );
}

function RightTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-2.5 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1.5",
        active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function BlockItem({ block }: { block: ParsedBlock }) {
  const isHeader = block.type === "SECTIONHEADER";
  return (
    <div className="rounded-lg border overflow-hidden">
      <div
        className={cn(
          "px-3 py-2 text-xs font-semibold border-b flex items-center justify-between",
          isHeader ? "bg-rose-50 text-rose-700 border-rose-100" : "bg-blue-50 text-blue-700 border-blue-100"
        )}
      >
        <span>{block.type}</span>
      </div>
      <div className="p-3 text-sm text-slate-800 whitespace-pre-wrap break-words">
        {block.text || "(empty)"}
      </div>
    </div>
  );
}

function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-6 text-center">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </div>
  );
}

function Overlay({ blocks }: { blocks: ParsedBlock[] }) {
  // 只画有 bbox 的块
  const boxes = blocks.filter((b) => b.bbox);
  if (boxes.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {boxes.map((b, idx) => {
        const bb = b.bbox!;
        return (
          <div
            key={idx}
            className="absolute border-2 border-blue-500/80 bg-blue-500/10"
            style={{
              left: `${bb.x * 100}%`,
              top: `${bb.y * 100}%`,
              width: `${bb.w * 100}%`,
              height: `${bb.h * 100}%`,
            }}
            title={b.type}
          />
        );
      })}
    </div>
  );
}
