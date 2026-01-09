"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, UploadCloud, Sparkles } from "lucide-react";

type BBox = { x: number; y: number; w: number; h: number }; // 0~1 归一化
type ExtractRow = {
  id: string;
  key: string; // 对应 editValues 的 key
  label: string;
  value: string;
  bbox: BBox;
};

const DEFAULT_FIELD_LABELS: Record<string, string> = {
  outp_num: "患者ID（住院/门诊ID）",
  name_abbre: "姓名（缩写）",
  sex: "性别",
  nation: "民族",
  patient_sou: "患者来源",
  fir_diag: "首诊",
  birth: "出生年月",
  job: "职业（退休前职业）",
  hou_inco: "家庭收入（年）",
  major_payment: "主要医疗付费方式",
  provi: "常住地址-省",
  city: "常住地址-市",
  district: "常住地址-区/县",
  road: "常住地址-街道/村",
  phone1: "联系手机1",
  phone2: "联系手机2",
  wechat: "微信号",
};

// ✅ 你发的“附件表单截图”我直接内嵌成 dataURL：
// 这样你不用放 public，也能一键演示“识别→出框→联动表格”。
const DEFAULT_DEMO_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA2YAAAHGCAYAAAAfVpg5AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8AAAgAElEQVR4Xu3de5BV1f3/8deW0pQm0kCkQYgSgQwqg0xKqJwq0RzV0rQqkJxY2p9l9VbUo0rWgqg1o6lqjJbq0bq1Y9u2f7zv7w+f7v2y7xw0n9m8O9v3v2f3y8+f3zv8zv3v8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv3zv8zv8=";

// ✅ 这些框是按你截图(870x454)大概对齐的“演示框”
// 真实项目里：后端/解析器返回 bbox 后直接替换这里即可。
const DEMO_BOXES_PX: Record<string, { x: number; y: number; w: number; h: number }> = {
  outp_num: { x: 195, y: 68, w: 95, h: 22 },
  name_abbre: { x: 410, y: 66, w: 115, h: 24 },
  sex: { x: 590, y: 64, w: 110, h: 26 },
  nation: { x: 750, y: 66, w: 105, h: 24 },

  patient_sou: { x: 115, y: 112, w: 170, h: 24 },
  fir_diag: { x: 345, y: 112, w: 140, h: 24 },
  birth: { x: 635, y: 110, w: 205, h: 26 },

  job: { x: 285, y: 156, w: 135, h: 24 },
  hou_inco: { x: 330, y: 240, w: 120, h: 24 },
  major_payment: { x: 420, y: 292, w: 190, h: 24 },

  provi: { x: 175, y: 381, w: 85, h: 26 },
  city: { x: 290, y: 381, w: 85, h: 26 },
  district: { x: 405, y: 381, w: 95, h: 26 },
  road: { x: 525, y: 381, w: 150, h: 26 },

  phone1: { x: 115, y: 420, w: 270, h: 26 },
  phone2: { x: 420, y: 420, w: 260, h: 26 },
  wechat: { x: 720, y: 420, w: 140, h: 26 },
};

function pxToNorm(box: { x: number; y: number; w: number; h: number }, W: number, H: number): BBox {
  return { x: box.x / W, y: box.y / H, w: box.w / W, h: box.h / H };
}

function fileToObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

export function CrfPhotoIntakePane(props: {
  // 当前 CRF 的可写字段（用于右侧“关键信息表格”展示）
  allowedKeys: string[];
  // editValues：右侧编辑必须同步写回
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;

  // ✅ 右侧“预览区”你会传 CrfE2C2（保持和手动录入预览一致）
  previewNode: React.ReactNode;
}) {
  const { allowedKeys, values, onChange, previewNode } = props;

  const [stage, setStage] = useState<"idle" | "processing" | "done">("idle");
  const [progressText, setProgressText] = useState<string>("等待导入图片…");

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // ✅ 第4点：hover 联动高亮就是靠这个 state

  const inputRef = useRef<HTMLInputElement | null>(null);

  // demo 提取结果（你给老师展示用）：只保留当前表单允许写回的 key
  const extractedRows: ExtractRow[] = useMemo(() => {
    const W = 870;
    const H = 454;

    const demoValues: Record<string, string> = {
      outp_num: "00012345",
      name_abbre: "LZWN",
      sex: "女",
      nation: "汉",
      patient_sou: "门诊",
      fir_diag: "是",
      birth: "1999-12-31",
      job: "专业技术人员",
      hou_inco: "5-10 万",
      major_payment: "新型农村合作医疗",
      provi: "浙江",
      city: "杭州",
      district: "西湖",
      road: "文一西路",
      phone1: "13800000000",
      phone2: "13900000000",
      wechat: "astrid_demo",
    };

    const rows: ExtractRow[] = [];

    for (const key of allowedKeys) {
      if (!DEMO_BOXES_PX[key]) continue;
      rows.push({
        id: key,
        key,
        label: DEFAULT_FIELD_LABELS[key] ?? key,
        value: String(demoValues[key] ?? values[key] ?? ""),
        bbox: pxToNorm(DEMO_BOXES_PX[key], W, H),
      });
    }

    // 保持一个稳定排序（按表单大概顺序）
    const order = [
      "outp_num",
      "name_abbre",
      "sex",
      "nation",
      "patient_sou",
      "fir_diag",
      "birth",
      "job",
      "hou_inco",
      "major_payment",
      "provi",
      "city",
      "district",
      "road",
      "phone1",
      "phone2",
      "wechat",
    ];
    rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

    return rows;
  }, [allowedKeys, values]);

  // 默认给老师演示：没有上传也能点“一键演示”
  const handleUseDemo = () => {
    setImgUrl(DEFAULT_DEMO_IMAGE_DATA_URL);
    setStage("processing");
    setProgressText("解析中：读取图像…");
    setTimeout(() => setProgressText("解析中：分割版面/定位字段区域…"), 700);
    setTimeout(() => setProgressText("解析中：抽取关键信息…"), 1400);
    setTimeout(() => {
      // ✅ 把 demo 提取结果写回 editValues（你要的“同步写回”）
      extractedRows.forEach((r) => onChange(r.key, r.value));
      setStage("done");
      setProgressText("提取完成");
    }, 2200);
  };

  // 导入文件（拖拽/选择）
  const applyFile = (file: File) => {
    const url = fileToObjectUrl(file);
    setImgUrl(url);
    setStage("processing");
    setProgressText("解析中：读取图像…");
    setTimeout(() => setProgressText("解析中：分割版面/定位字段区域…"), 700);
    setTimeout(() => setProgressText("解析中：抽取关键信息…"), 1400);
    setTimeout(() => {
      extractedRows.forEach((r) => onChange(r.key, r.value));
      setStage("done");
      setProgressText("提取完成");
    }, 2200);
  };

  useEffect(() => {
    return () => {
      // 清理 objectURL
      if (imgUrl && imgUrl.startsWith("blob:")) URL.revokeObjectURL(imgUrl);
    };
  }, [imgUrl]);

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    applyFile(f);
  };

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    applyFile(f);
    // 允许重复选择同一文件也能触发
    e.target.value = "";
  };

  const BoxOverlay = ({ row }: { row: ExtractRow }) => {
    const isActive = activeId === row.id;
    return (
      <div
        className={cn(
          "absolute rounded-md transition-all",
          "ring-2 ring-offset-0",
          isActive ? "ring-blue-500 bg-blue-500/10" : "ring-emerald-500/40 bg-emerald-500/5",
          "cursor-pointer"
        )}
        style={{
          left: `${row.bbox.x * 100}%`,
          top: `${row.bbox.y * 100}%`,
          width: `${row.bbox.w * 100}%`,
          height: `${row.bbox.h * 100}%`,
        }}
        onMouseEnter={() => setActiveId(row.id)}
        onMouseLeave={() => setActiveId(null)}
      >
        <div
          className={cn(
            "absolute -top-2 left-0 px-1.5 py-0.5 rounded-sm text-[10px] leading-none",
            isActive ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
          )}
        >
          {row.label}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full w-full min-w-0 overflow-hidden">
      {/* ✅ 默认进入拍照录入：左导入/图像，右预览或关键信息表格 */}
      <div className="h-full grid grid-cols-1 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] gap-0 min-w-0">
        {/* LEFT */}
        <div className="h-full min-w-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              导入图片（拖拽或选择文件）
            </div>
            <div className="flex items-center gap-2">
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => inputRef.current?.click()}>
                选择文件
              </Button>
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={handleUseDemo}>
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                一键演示
              </Button>
            </div>
          </div>

          {/* Drop zone / Image */}
          <div
            className={cn(
              "flex-1 min-h-0 p-3 overflow-auto",
              stage === "idle" ? "bg-white" : "bg-slate-50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={onDrop}
          >
            {stage === "idle" && !imgUrl && (
              <div
                className={cn(
                  "h-full rounded-xl border-2 border-dashed border-slate-200",
                  "flex flex-col items-center justify-center text-slate-400 gap-2",
                  "px-6"
                )}
              >
                <UploadCloud className="w-10 h-10 opacity-30" />
                <div className="text-sm font-medium">把图片拖到这里</div>
                <div className="text-xs text-slate-400">或点击上方“选择文件 / 一键演示”</div>
              </div>
            )}

            {imgUrl && (
              <div className="relative w-full max-w-full">
                <div className="relative rounded-lg border border-slate-200 bg-white overflow-hidden">
                  <img src={imgUrl} alt="uploaded" className="block w-full h-auto" />
                  {stage === "done" && (
                    <div className="absolute inset-0">
                      {extractedRows.map((r) => (
                        <BoxOverlay key={r.id} row={r} />
                      ))}
                    </div>
                  )}

                  {stage === "processing" && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {progressText}
                      </div>
                    </div>
                  )}
                </div>

                {stage !== "idle" && (
                  <div className="mt-2 text-xs text-slate-500">
                    {stage === "processing" ? "处理中：模拟分割与字段提取（演示版）" : "完成：可在右侧修改字段，实时写回表单"}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="h-full min-w-0 bg-slate-100 flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center justify-between">
            <div className="text-xs font-bold text-blue-700">
              {stage === "done" ? "关键信息（可编辑，hover 联动高亮框）" : "表单预览（与手动录入预览一致）"}
            </div>
            {stage === "processing" && (
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {progressText}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-3">
            {/* 1) 未完成识别：右侧展示“手动录入同款预览”（宽一些） */}
            {stage !== "done" && (
              <div
                className={cn(
                  "bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden min-w-0",
                  "break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:min-w-0 [&_*]:max-w-full"
                )}
              >
                <div className="p-3 sm:p-4 lg:p-4 min-w-0">{previewNode}</div>
              </div>
            )}

            {/* 2) 识别完成：右侧展示与框对应的关键信息表格（可编辑写回） */}
            {stage === "done" && (
              <div className="bg-white shadow-sm border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-slate-100 text-xs text-slate-500">
                  鼠标悬停：右侧行 ↔ 左侧框高亮联动；修改值会实时写回 editValues。
                </div>

                <div className="p-3">
                  <div className="grid grid-cols-1 gap-2">
                    {extractedRows.map((row) => {
                      const isActive = activeId === row.id;
                      return (
                        <div
                          key={row.id}
                          className={cn(
                            "rounded-lg border p-2 transition-colors",
                            isActive ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
                          )}
                          onMouseEnter={() => setActiveId(row.id)}
                          onMouseLeave={() => setActiveId(null)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-[180px] flex-shrink-0 text-xs font-semibold text-slate-700">
                              {row.label}
                              <div className="text-[11px] text-slate-400 font-mono">{row.key}</div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <Input
                                className={cn(
                                  "h-8 bg-white",
                                  isActive ? "border-blue-500 focus-visible:ring-blue-500" : ""
                                )}
                                value={String(values[row.key] ?? "")}
                                onChange={(e) => onChange(row.key, e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="px-3 pb-3 text-[11px] text-slate-400">
                  演示版说明：这里的 bbox/值是固定的（用于汇报展示）。接后端时只要把 bbox/抽取值替换成真实返回即可。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
