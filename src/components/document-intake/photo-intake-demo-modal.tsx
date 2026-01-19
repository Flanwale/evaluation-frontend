"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Brackets,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImagePlus,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

type ParseMode = "fast" | "balanced" | "accurate";
type Stage = "select" | "parsing" | "result";

type ParsedBlock = {
  type: "SECTIONHEADER" | "TEXT";
  text: string;
};

type IntakeDemoResult = {
  extracted_fields: Record<string, any>;
  blocks: ParsedBlock[];
  html: string;
  markdown: string;
  pages: { pageNo: number; imageUrl?: string }[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_VALUES: Record<string, any> = {
  outp_num: "4567890",
  name_abbre: "ZHWN",
  sex: "女",
  gender: "女",
  nation: "汉",
  patient_sou: "门诊",
  fir_diag: "是",
  birth: "1999-07-16",
  job: "专业技术人员",
  hou_inco: "5-10 万",
  major_payment: "城镇职工基本医疗保险",
  major_payment_other: "",
  provi: "浙江",
  city: "杭州",
  district: "西湖",
  road: "文三路 138 号",
  phone1: "13800138000",
  phone2: "18600001111",
  wechat: "demo_wechat_01",
};

function guessValueForKey(key: string) {
  const k = key.toLowerCase();
  if (key in DEFAULT_VALUES) return DEFAULT_VALUES[key];

  if (k.includes("date") || k.includes("birth") || k.includes("time")) return "2025-01-01";
  if (k.includes("phone") || k.includes("mobile") || k.includes("tel")) return "13800138000";
  if (k.includes("wechat") || k.includes("weixin")) return "demo_wechat_01";
  if (k.includes("sex") || k.includes("gender")) return "女";
  if (k.includes("name")) return "示例";
  if (k.endsWith("id") || k.includes("_id") || k.includes("patient")) return "TT002-XXXX";
  if (k.includes("nation") || k.includes("ethnic")) return "汉";
  if (k.includes("city")) return "杭州";
  if (k.includes("prov") || k.includes("province")) return "浙江";
  if (k.includes("district") || k.includes("county")) return "西湖";
  if (k.includes("addr") || k.includes("address") || k.includes("road") || k.includes("street"))
    return "示例地址";
  if (k.includes("age")) return "25";
  if (k.includes("height")) return "170";
  if (k.includes("weight")) return "60";
  if (k.includes("yes") || k.includes("no") || k.includes("flag")) return "是";

  return "（示例）";
}

function makeDemoResult(allowedKeys: string[], imageUrl?: string): IntakeDemoResult {
  const uniqKeys = Array.from(new Set(allowedKeys)).filter(Boolean);

  const extracted_fields: Record<string, any> = {};
  for (const key of uniqKeys) extracted_fields[key] = guessValueForKey(key);

  const blocks: ParsedBlock[] = [
    { type: "SECTIONHEADER", text: "自动识别结果（演示）" },
    ...Object.entries(extracted_fields)
      .slice(0, 12)
      .map(([k, v]): ParsedBlock => ({
        type: "TEXT",
        text: `${k}: ${String(v ?? "")}`,
      })),
  ];


  const htmlItems = Object.entries(extracted_fields)
    .slice(0, 20)
    .map(([k, v]) => `<li><code>${k}</code>：${String(v ?? "")}</li>`)
    .join("");

  const html = `
    <h3>自动识别结果（演示）</h3>
    <ul>${htmlItems}</ul>
    <p style="color:#64748b;font-size:12px;">只生成当前 CRF 允许写回的字段（allowedKeys）。</p>
  `;

  const markdown = [
    "### 自动识别结果（演示）",
    ...Object.entries(extracted_fields).slice(0, 20).map(([k, v]) => `- \`${k}\`: ${String(v ?? "")}`),
    "",
    "_只生成当前 CRF 允许写回的字段（allowedKeys）。_",
  ].join("\n");

  const pages = [{ pageNo: 0, imageUrl }];

  return { extracted_fields, blocks, html, markdown, pages };
}

export function PhotoIntakeDemoModal({
  open,
  onOpenChange,
  allowedKeys,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  allowedKeys: string[];
  onApply: (fields: Record<string, any>) => void;
}) {
  const allowedSet = useMemo(() => new Set(allowedKeys), [allowedKeys]);

  const [stage, setStage] = useState<Stage>("select");
  const [mode, setMode] = useState<ParseMode>("balanced");
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string>("");

  const [stepIndex, setStepIndex] = useState(0);
  const steps = ["Uploading Document", "Parsing Document", "Rendering Thumbnails", "Processing Complete"];
  const progressPct = [20, 55, 80, 100][stepIndex] ?? 20;

  const [result, setResult] = useState<IntakeDemoResult | null>(null);
  const [tabTop, setTabTop] = useState<"Parse" | "Extract">("Parse");
  const [tabRight, setTabRight] = useState<"Blocks" | "JSON" | "HTML" | "Markdown">("Blocks");
  const [renderHtml, setRenderHtml] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [pageIdx, setPageIdx] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setStage("select");
      setMode("balanced");
      setFile(null);
      setImgUrl("");
      setStepIndex(0);
      setResult(null);
      setTabTop("Parse");
      setTabRight("Blocks");
      setRenderHtml(true);
      setChecked({});
      setPageIdx(0);
    }
  }, [open]);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const startDemoParse = async () => {
    setStage("parsing");
    setStepIndex(0);

    await sleep(300);
    setStepIndex(1);
    await sleep(520);
    setStepIndex(2);
    await sleep(420);
    setStepIndex(3);
    await sleep(120);

    const demo = makeDemoResult(allowedKeys, imgUrl || "");
    setResult(demo);

    const init: Record<string, boolean> = {};
    Object.keys(demo.extracted_fields).forEach((k) => (init[k] = allowedSet.has(k)));
    setChecked(init);

    setStage("result");
  };

  const toggleAllMatch = (v: boolean) => {
    if (!result) return;
    const next = { ...checked };
    Object.keys(result.extracted_fields).forEach((k) => {
      if (allowedSet.has(k)) next[k] = v;
    });
    setChecked(next);
  };

  const applyToForm = () => {
    if (!result) return;
    const picked: Record<string, any> = {};
    Object.entries(result.extracted_fields).forEach(([k, v]) => {
      if (checked[k] && allowedSet.has(k)) picked[k] = v;
    });
    onApply(picked);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ✅ 更大 + 自适应：max-h 限制，内容用 flex 伸展，必要时内部滚动 */}
      <DialogContent className="max-w-[1600px] w-[98vw] max-h-[95vh] h-auto p-0 overflow-hidden flex flex-col">
        {/* ✅ 无障碍：DialogContent 需要 DialogTitle（隐藏即可） */}
        <DialogHeader className="sr-only">
          <DialogTitle>拍照录入</DialogTitle>
        </DialogHeader>

        {/* 自定义 header */}
        <div className="h-12 px-4 flex items-center justify-between border-b bg-white flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-800">拍照录入（自适应 demo）</span>
            <span className="text-xs text-slate-400 truncate">allowedKeys={allowedKeys.length}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ✅ body：不再写死 calc 高度，用 flex-1 自适应 */}
        <div className="flex-1 bg-slate-50 overflow-hidden">
          {/* select */}
          {stage === "select" && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 p-4 overflow-auto">
              <div
                className={cn(
                  "min-h-[520px] rounded-xl border border-dashed border-slate-300 bg-white",
                  "flex flex-col items-center justify-center p-6",
                  "hover:border-blue-400 transition-colors"
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) setFile(f);
                }}
              >
                <div className="w-full max-w-[560px]">
                  <div className="flex items-center justify-center mb-6">
                    <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
                      <ImagePlus className="w-7 h-7 text-slate-600" />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-lg font-semibold text-slate-800">Drag and drop your image here</div>
                    <div className="text-sm text-slate-500 mt-1">
                      或{" "}
                      <button className="underline text-blue-600" onClick={() => fileInputRef.current?.click()}>
                        click to browse
                      </button>
                    </div>
                  </div>

                  <div className="mt-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <ImagePlus className="w-4 h-4 mr-2" />
                        选择图片
                      </Button>

                      <Button
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={startDemoParse}
                        disabled={allowedKeys.length === 0}
                        title={allowedKeys.length === 0 ? "当前表单没有字段（allowedKeys为空）" : "开始演示解析流程"}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        开始解析（演示）
                      </Button>
                    </div>

                    <div className="text-xs text-slate-500 mt-2">
                      demo 会根据当前 CRF 字段（allowedKeys）生成对应值并可写回。
                    </div>
                  </div>

                  {imgUrl && (
                    <div className="mt-6 rounded-lg border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt="preview" className="w-full h-auto block" />
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-[520px] rounded-xl border bg-white p-4 flex flex-col overflow-auto">
                <div className="text-sm font-semibold text-slate-800">Parse Settings</div>
                <div className="text-xs text-slate-500 mt-1">演示 mode 切换：fast / balanced / accurate</div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                  <ModeCard
                    title="Fast"
                    desc="Lowest latency, great for real-time use cases."
                    active={mode === "fast"}
                    onClick={() => setMode("fast")}
                  />
                  <ModeCard
                    title="Balanced"
                    desc="Balanced accuracy and latency, works well with most documents."
                    active={mode === "balanced"}
                    onClick={() => setMode("balanced")}
                  />
                  <ModeCard
                    title="Accurate"
                    desc="Highest accuracy and latency. Good on the most complex documents."
                    active={mode === "accurate"}
                    onClick={() => setMode("accurate")}
                  />
                </div>

                <div className="mt-6 text-xs text-slate-500 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  这是纯前端演示：后端接好后，把 makeDemoResult 替换成 fetch 返回即可。
                </div>
              </div>
            </div>
          )}

          {/* parsing */}
          {stage === "parsing" && (
            <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_520px] gap-4 p-4 overflow-auto">
              <div className="min-h-[520px] rounded-xl border bg-white p-6 flex items-center justify-center">
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
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">{progressPct}%</div>
                  </div>
                </div>
              </div>

              <div className="min-h-[520px] rounded-xl border bg-white p-6 overflow-auto">
                <div className="text-sm font-semibold text-slate-800">Parse</div>
                <div className="text-xs text-slate-500 mt-1">
                  Mode: <span className="font-mono">{mode}</span>
                </div>
              </div>
            </div>
          )}

          {/* result */}
          {stage === "result" && result && (
            <div className="h-full flex flex-col">
              <div className="h-12 px-4 border-b bg-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <TopTab active={tabTop === "Parse"} onClick={() => setTabTop("Parse")} label="Parse" />
                  <TopTab active={tabTop === "Extract"} onClick={() => setTabTop("Extract")} label="Extract" />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStage("select")}>
                    重新导入
                  </Button>
                  {tabTop === "Extract" && (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={applyToForm}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      写回表格
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 lg:grid-cols-[520px_1fr] min-w-0 overflow-hidden">
                {/* left */}
                <div className="h-full border-r bg-white overflow-hidden flex flex-col min-w-0">
                  <div className="h-11 px-3 border-b flex items-center justify-between bg-slate-50 flex-shrink-0">
                    <div className="text-sm text-slate-700">
                      Page <span className="font-mono">{pageIdx}</span>
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
                        onClick={() => setPageIdx((p) => Math.min(result.pages.length - 1, p + 1))}
                        disabled={pageIdx >= result.pages.length - 1}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-3">
                    {result.pages[pageIdx]?.imageUrl ? (
                      <div className="rounded-lg border overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={result.pages[pageIdx].imageUrl} alt="page" className="w-full h-auto block" />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400">未选择图片（演示仍可用）</div>
                    )}
                  </div>
                </div>

                {/* right */}
                <div className="h-full bg-white overflow-hidden flex flex-col min-w-0">
                  {tabTop === "Parse" && (
                    <div className="h-11 px-3 border-b bg-white flex items-center justify-between flex-shrink-0">
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
                          icon={<FileText className="w-4 h-4" />}
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
                          <input type="checkbox" checked={renderHtml} onChange={(e) => setRenderHtml(e.target.checked)} />
                          Render HTML
                        </label>
                      )}
                    </div>
                  )}

                  <div className="flex-1 overflow-auto p-3">
                    {tabTop === "Parse" && (
                      <>
                        {tabRight === "Blocks" && (
                          <div className="space-y-3">
                            {result.blocks.map((b, idx) => (
                              <div key={idx} className="rounded-lg border overflow-hidden">
                                <div
                                  className={cn(
                                    "px-3 py-2 text-xs font-semibold border-b",
                                    b.type === "SECTIONHEADER"
                                      ? "bg-rose-50 text-rose-700 border-rose-100"
                                      : "bg-blue-50 text-blue-700 border-blue-100"
                                  )}
                                >
                                  {b.type}
                                </div>
                                <div className="p-3 text-sm text-slate-800 whitespace-pre-wrap break-words">{b.text}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {tabRight === "JSON" && (
                          <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto">
{JSON.stringify(result, null, 2)}
                          </pre>
                        )}

                        {tabRight === "HTML" && (
                          <div className="border rounded-lg overflow-hidden">
                            {renderHtml ? (
                              <div className="p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: result.html }} />
                            ) : (
                              <pre className="text-xs bg-slate-50 p-3 overflow-auto">{result.html}</pre>
                            )}
                          </div>
                        )}

                        {tabRight === "Markdown" && (
                          <pre className="text-xs bg-slate-50 border rounded-lg p-3 overflow-auto">{result.markdown}</pre>
                        )}
                      </>
                    )}

                    {tabTop === "Extract" && (
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-800">识别字段（可写回表格）</div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleAllMatch(true)}>
                              全选
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => toggleAllMatch(false)}>
                              取消全选
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 border rounded-lg overflow-hidden">
                          <div className="divide-y">
                            {Object.entries(result.extracted_fields).map(([k, v]) => (
                              <div key={k} className="p-3 flex items-start gap-3 bg-white">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={!!checked[k]}
                                  onChange={(e) => setChecked((prev) => ({ ...prev, [k]: e.target.checked }))}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-slate-800">{k}</span>
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-green-100 text-green-700">
                                      可写回
                                    </span>
                                  </div>

                                  <Input
                                    className="mt-2"
                                    value={String(v ?? "")}
                                    onChange={(e) => {
                                      result.extracted_fields[k] = e.target.value;
                                      setResult({ ...result });
                                    }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button className="bg-blue-600 hover:bg-blue-700" onClick={applyToForm}>
                            <Sparkles className="w-4 h-4 mr-2" />
                            写回表格
                          </Button>
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
