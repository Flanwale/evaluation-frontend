// src/components/forms/crf-e2-c2.tsx
"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormProps {
  data: any[];
  isEditing: boolean;
  values: any;
  onChange: (key: string, value: any) => void;
  /** ✅ 新增：高亮控制 props */
  highlightKey?: string | null;
  onHoverKey?: (key: string | null) => void;
}

type DataItem = { key: string; label?: string; value?: any };

const PATIENT_PREFIX_LEN = 5;

function splitPatientId(raw: string) {
  const v = String(raw ?? "").trim();
  if (!v) return { prefix: "", suffix: "" };

  const idx = v.indexOf("-");
  if (idx === -1) {
    if (v.length <= PATIENT_PREFIX_LEN) return { prefix: v, suffix: "" };
    return { prefix: v.slice(0, PATIENT_PREFIX_LEN), suffix: v.slice(PATIENT_PREFIX_LEN) };
  }
  return { prefix: v.slice(0, idx), suffix: v.slice(idx + 1) };
}

function joinPatientId(prefix: string, suffix: string) {
  const p = String(prefix ?? "").trim();
  const s = String(suffix ?? "").trim();
  if (!p && !s) return "";
  if (p && !s) return p;
  if (!p && s) return s;
  return `${p}-${s}`;
}

// 辅助组件：用于包裹表单行
const FormRow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col sm:flex-row flex-wrap gap-x-8 gap-y-4 items-baseline min-w-0", className)}>
    {children}
  </div>
);

// 辅助组件：章节标题
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-8 mb-4 pb-2 border-b border-gray-200 text-lg font-bold text-black min-w-0">
    {children}
  </div>
);

export function CrfE2C2({
  data,
  isEditing,
  values,
  onChange,
  highlightKey,
  onHoverKey,
}: FormProps) {
  const dataMap = useMemo(() => {
    const m: Record<string, any> = {};
    (data as DataItem[]).forEach((f) => {
      if (f?.key) m[f.key] = f.value;
    });
    return m;
  }, [data]);

  const getValue = (key: string) => {
    const vEdit = values?.[key];
    const vData = dataMap[key];
    if (isEditing) return vEdit ?? vData ?? "";
    return vData ?? vEdit ?? "";
  };

  /** ✅ 高亮包装器：处理鼠标悬停和样式激活 */
  const Highlighter = ({
    fieldKey,
    children,
    className,
  }: {
    fieldKey: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    const isActive = highlightKey === fieldKey;
    return (
      <div
        className={cn(
          "relative transition-all duration-200 rounded px-1 -mx-1",
          // ✅ 只有 isActive 时才显示蓝色背景，平时只是 hover 有淡淡灰色
          isActive ? "bg-blue-100 ring-2 ring-blue-500/50 z-10 shadow-sm" : "hover:bg-gray-50",
          className
        )}
        onMouseEnter={() => onHoverKey?.(fieldKey)}
        onMouseLeave={() => onHoverKey?.(null)}
      >
        {children}
      </div>
    );
  };

  const renderUnderlineInput = (key: string, width = "w-20") => {
    const val = getValue(key);
    const content = isEditing ? (
      <Input
        className={cn(
          "h-7 px-1 py-0 border-0 border-b border-black rounded-none focus-visible:ring-0",
          // ✅ 关键：输入框背景必须透明，否则会遮挡 Highlighter 的背景
          "bg-transparent hover:bg-transparent",
          "inline-block text-center min-w-0 font-serif",
          width
        )}
        value={val || ""}
        onChange={(e) => onChange(key, e.target.value)}
      />
    ) : (
      <span
        className={cn(
          "inline-block border-b border-black min-h-[24px] px-2 text-center text-blue-900 font-medium",
          "min-w-0",
          width
        )}
      >
        {val}
      </span>
    );

    return <Highlighter fieldKey={key}>{content}</Highlighter>;
  };

  const renderRadio = (key: string, options: string[]) => {
    const currentVal = String(getValue(key) ?? "");
    return (
      <Highlighter fieldKey={key} className="inline-flex">
        <div className="flex flex-wrap gap-x-5 gap-y-2 items-center ml-1 min-w-0">
          {options.map((opt) => (
            <div
              key={opt}
              className="flex items-center gap-1.5 cursor-pointer select-none group min-w-0"
              onClick={() => isEditing && onChange(key, opt)}
              title={opt}
            >
              <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center flex-shrink-0 bg-white">
                {currentVal === opt && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
              </div>
              <span className="text-base break-words leading-tight">{opt}</span>
            </div>
          ))}
        </div>
      </Highlighter>
    );
  };

  const renderDateBoxes = (key: string) => {
    const raw = String(getValue(key) ?? "").trim();
    const digits = raw.match(/\d/g)?.join("") ?? "";
    const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
    const d = pad(digits, 8);

    const y = d.slice(0, 4).split("");
    const m = d.slice(4, 6).split("");
    const day = d.slice(6, 8).split("");

    const CharSlot = ({ ch }: { ch: string }) => (
      <div className="border-b border-black flex items-center justify-center text-sm leading-none flex-shrink-0 w-5 h-6 mx-[1px]">
        {/\d/.test(ch) ? ch : ""}
      </div>
    );

    return (
      <Highlighter fieldKey={key} className="inline-flex">
        <div className="flex flex-wrap items-center ml-1 min-w-0">
          {y.map((ch, idx) => <CharSlot key={`y${idx}`} ch={ch} />)}
          <span className="px-1 text-gray-500">/</span>
          {m.map((ch, idx) => <CharSlot key={`m${idx}`} ch={ch} />)}
          <span className="px-1 text-gray-500">/</span>
          {day.map((ch, idx) => <CharSlot key={`d${idx}`} ch={ch} />)}
        </div>
      </Highlighter>
    );
  };

  const renderCharBoxes = (key: string, count: number) => {
    const val: string = String(getValue(key) ?? "");
    const chars = Array.from({ length: count }).map((_, i) => (val && val[i]) || "");
    return (
      <Highlighter fieldKey={key} className="inline-flex">
        <div className="flex flex-wrap items-center ml-1 min-w-0">
          {chars.map((c, idx) => (
            <div
              key={idx}
              className="border-b border-black flex items-center justify-center text-sm leading-none flex-shrink-0 w-6 h-6 mx-[2px]"
            >
              {c}
            </div>
          ))}
        </div>
      </Highlighter>
    );
  };

  const renderPatientId = () => {
    const key = "outp_num";
    const raw = String(getValue(key) ?? "");
    const { prefix, suffix } = splitPatientId(raw);

    const prefixChars = Array.from({ length: PATIENT_PREFIX_LEN }).map((_, i) => prefix[i] || "");

    const setPrefixAt = (i: number, ch: string) => {
      const arr = prefixChars.slice();
      arr[i] = ch;
      const nextPrefix = arr.join("").trimEnd();
      onChange(key, joinPatientId(nextPrefix, suffix));
    };

    const setSuffix = (s: string) => {
      onChange(key, joinPatientId(prefix, s));
    };

    return (
      <Highlighter fieldKey={key}>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-end gap-x-2 gap-y-1 min-w-0">
            <span className="font-bold text-gray-700">患者 ID</span>
            
            {/* 只有这里微调一下，把 Input 改为透明背景以适应 highligter */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {prefixChars.map((c, idx) =>
                isEditing ? (
                  <Input
                    key={idx}
                    className="h-7 w-6 px-0 py-0 text-center font-serif border-0 border-b border-black rounded-none focus-visible:ring-0 bg-transparent"
                    value={c}
                    maxLength={1}
                    onChange={(e) => setPrefixAt(idx, (e.target.value || "").slice(-1))}
                  />
                ) : (
                  <div key={idx} className="border-b border-black flex items-center justify-center text-sm leading-none w-5 h-6">
                    {c}
                  </div>
                )
              )}
            </div>
            
            <span className="flex-shrink-0">-</span>
            
            <div className="w-24">
              {isEditing ? (
                <Input
                  className="h-7 px-1 py-0 border-0 border-b border-black rounded-none focus-visible:ring-0 bg-transparent inline-block text-center w-full font-serif"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                />
              ) : (
                <span className="inline-block border-b border-black min-h-[24px] px-2 text-center text-blue-900 font-medium w-full">
                  {suffix}
                </span>
              )}
            </div>
          </div>
          <div className="text-[11px] text-gray-400 font-serif">(中心编号+住院/门诊 ID)</div>
        </div>
      </Highlighter>
    );
  };

  const majorPaymentVal = String(getValue("major_payment") ?? "");

  return (
    <div className="w-full max-w-5xl mx-auto bg-white text-black font-serif leading-relaxed px-4 py-8 sm:px-8">
      {/* 顶部标题 */}
      <div className="text-center mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-widest text-black">一、 基本信息</h1>
      </div>

      {/* 1.1 人口学信息 */}
      <div className="mb-10">
        <SectionTitle>1.1 人口学信息</SectionTitle>

        <div className="space-y-6">
          <FormRow className="items-end">
            <div className="mr-8">{renderPatientId()}</div>

            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <span className="flex-shrink-0">姓名（缩写）：</span>
              {isEditing ? (
                <Highlighter fieldKey="name_abbre">
                  <Input
                    className="h-7 w-24 px-1 py-0 border-0 border-b border-black rounded-none focus-visible:ring-0 bg-transparent text-center font-serif"
                    value={String(getValue("name_abbre") ?? "")}
                    maxLength={4}
                    onChange={(e) => onChange("name_abbre", e.target.value)}
                  />
                </Highlighter>
              ) : (
                renderCharBoxes("name_abbre", 4)
              )}
            </div>
          </FormRow>

          <FormRow>
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <span className="flex-shrink-0">性别：</span>
              {renderRadio("sex", ["男", "女"])}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <span className="flex-shrink-0">民族：</span>
              {renderUnderlineInput("nation", "w-24")}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <span className="flex-shrink-0">出生年月：</span>
              {isEditing ? (
                <Highlighter fieldKey="birth">
                  <Input
                    type="date"
                    className="h-7 w-40 border-0 border-b border-black rounded-none p-0 bg-transparent ml-2 focus-visible:ring-0 font-serif"
                    value={String(getValue("birth") ?? "")}
                    onChange={(e) => onChange("birth", e.target.value)}
                  />
                </Highlighter>
              ) : (
                renderDateBoxes("birth")
              )}
            </div>
          </FormRow>

          <FormRow>
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
              <span className="flex-shrink-0">患者来源：</span>
              {renderRadio("patient_sou", ["门诊", "住院"])}
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-shrink-0 sm:ml-8">
              <span className="flex-shrink-0">首诊：</span>
              {renderRadio("fir_diag", ["是", "否"])}
            </div>
          </FormRow>

          <div className="flex flex-col sm:flex-row items-start gap-2 pt-2">
            <span className="flex-shrink-0 pt-1">职业（退休前职业）：</span>
            <div className="flex-1">
              {renderRadio("job", [
                "国家机关、党群组织、企业、事业单位负责人",
                "专业技术人员",
                "办事人员和有关人员",
                "商业、服务业人员",
                "农、林、牧、渔、水利业生产人员",
                "生产、运输设备操作人员及有关人员",
                "军人",
                "不便分类的其他从业人员",
              ])}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-2">
            <span className="flex-shrink-0 pt-1">家庭收入（年）：</span>
            <div className="flex-1">
              {renderRadio("hou_inco", ["10万以上", "5-10万", "3-5万", "3万以下"])}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-2">
            <span className="flex-shrink-0 pt-1">主要医疗付费方式：</span>
            <div className="flex-1 flex flex-wrap gap-2 items-center">
              {renderRadio("major_payment", [
                "城镇职工基本医疗保险",
                "新城镇居民基本医疗保险",
                "新型农村合作医疗",
                "商业医疗保险",
                "全公费",
                "全自费",
                "其他社会保险",
                "贫困救助",
              ])}
              
              <div className="flex items-center gap-2 mt-1 sm:mt-0">
                <Highlighter fieldKey="major_payment">
                   <div 
                      className="flex items-center gap-1.5 cursor-pointer select-none group"
                      onClick={() => isEditing && onChange("major_payment", "其他")}
                   >
                       <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center flex-shrink-0 bg-white">
                           {majorPaymentVal === "其他" && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                       </div>
                       <span>其他</span>
                   </div>
                </Highlighter>
                
                {majorPaymentVal === "其他" && (
                    <div className="ml-1">
                        {renderUnderlineInput("major_payment_other", "w-48")}
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1.2 通讯及联系方式 */}
      <div className="mb-6">
        <SectionTitle>1.2 通讯及联系方式</SectionTitle>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-y-4 gap-x-2">
            <span className="flex-shrink-0 font-bold text-gray-700">常住地址：</span>
            
            <div className="flex items-center gap-1">
              {renderUnderlineInput("provi", "w-20")}
              <span className="text-gray-600">省</span>
            </div>

            <div className="flex items-center gap-1">
              {renderUnderlineInput("city", "w-20")}
              <span className="text-gray-600">市</span>
            </div>

            <div className="flex items-center gap-1">
              {renderUnderlineInput("district", "w-20")}
              <span className="text-gray-600">区/县</span>
            </div>

            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
              {renderUnderlineInput("road", "w-full")}
              <span className="text-gray-600 flex-shrink-0">街道/村</span>
            </div>
          </div>

          <FormRow>
            <div className="flex items-center gap-2 min-w-0 flex-shrink-0 flex-1 min-w-[200px]">
              <span className="flex-shrink-0">联系手机 1：</span>
              <div className="flex-1">{renderUnderlineInput("phone1", "w-full")}</div>
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-shrink-0 flex-1 min-w-[200px]">
              <span className="flex-shrink-0">联系手机 2：</span>
              <div className="flex-1">{renderUnderlineInput("phone2", "w-full")}</div>
            </div>

            <div className="flex items-center gap-2 min-w-0 flex-shrink-0 flex-1 min-w-[200px]">
              <span className="flex-shrink-0">微信号：</span>
              <div className="flex-1">{renderUnderlineInput("wechat", "w-full")}</div>
            </div>
          </FormRow>
        </div>
      </div>

      <div className="text-center text-xs mt-12 text-gray-300">crf_e2_c2</div>
    </div>
  );
}