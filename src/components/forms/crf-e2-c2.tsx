// src/components/forms/crf-e2-c2.tsx
"use client";

import React, { useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// ----------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------

interface FormProps {
  data: any[];
  isEditing: boolean;
  values: any;
  onChange: (key: string, value: any) => void;
  highlightKey?: string | null;
  onHoverKey?: (key: string | null) => void;

  // ✅ 新增：由外部传入工具栏
  actionToolbar?: React.ReactNode;
}


type DataItem = { key: string; label?: string; value?: any };

const PATIENT_PREFIX_LEN = 5;

type FieldKey =
  | "outp_num"
  | "name_abbre"
  | "sex"
  | "nation"
  | "birth"
  | "patient_sou"
  | "fir_diag"
  | "job"
  | "hou_inco"
  | "major_payment"
  | "major_payment_other"
  | "provi"
  | "city"
  | "district"
  | "road"
  | "phone1"
  | "phone2"
  | "wechat";

function splitPatientId(raw: string) {
  const v = String(raw ?? "").trim();
  if (!v) return { prefix: "", suffix: "" };

  const idx = v.indexOf("-");
  if (idx === -1) {
    if (v.length <= PATIENT_PREFIX_LEN) return { prefix: v, suffix: "" };
    return {
      prefix: v.slice(0, PATIENT_PREFIX_LEN),
      suffix: v.slice(PATIENT_PREFIX_LEN),
    };
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

// ----------------------------------------------------------------------
// 统一样式（更像截图里的“医院系统”）
// ----------------------------------------------------------------------

const FONT_BASE = "text-[12px]";
const CONTROL_H = "h-8"; // 比原来更收敛一点，更像传统系统
const BORDER = "border border-[#b5d6de]";
const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-[#7aa6d9] focus-visible:border-[#6f9fd6]";
const DISABLED = "bg-[#f1f5f9] text-[#475569]";

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("min-h-screen bg-white p-6 text-[#0f172a]", FONT_BASE)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </div>
  );
}

function HeaderBar({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 border-b border-[#cbd5e1] pb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-bold text-[#173a5e]">
            {title}
          </div>
          <div className="mt-1 text-[#64748b]">请输入/核对患者信息</div>
        </div>
        <div className="shrink-0">{right}</div>
      </div>
    </div>
  );
}

function SectionPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 border border-[#98b5d3] bg-white", className)}>
      {/* 
         1. 标题栏：使用你提供的渐变色
            from-[#dbeaf7] to-[#bcd6ee] -> 模拟凸起的立体感
            border-b border-[#98b5d3]   -> 底部边框分割线
      */}
      <div 
        className={cn(
          "px-3 py-1.5 border-b border-[#98b5d3]",
          "bg-gradient-to-b from-[#dbeaf7] to-[#bcd6ee]" 
        )}
      >
        <span className="font-bold text-[#173a5e] text-[13px] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]">
          {title}
        </span>
      </div>

      {/* 
         2. 内容区：
            修改为 #f4f8fc (极淡的蓝灰色)，这是医疗系统最经典的底色。
            千万不要用渐变，也不要用发绿的 #f1f6f1。
      */}
      <div className="p-4 bg-[#f4f8fc]">
        {children}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 字段块：无外框（保持要求）
// highlight 用浅黄底提示
// ----------------------------------------------------------------------

function FieldBlock({
  label,
  required,
  children,
  active,
  fieldKey,
  onHoverKey,
  className,
  rightHint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  active?: boolean;
  fieldKey: string;
  onHoverKey?: (k: string | null) => void;
  className?: string;
  rightHint?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "px-1 py-1",
        active ? "bg-[#fff7dc]" : "",
        className
      )}
      onMouseEnter={() => onHoverKey?.(fieldKey)}
      onMouseLeave={() => onHoverKey?.(null)}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          {required ? <span className="text-red-600">*</span> : null}
          <div
            className={cn(
              "min-w-0 truncate whitespace-nowrap font-semibold text-[#1f2f46]",
              FONT_BASE
            )}
          >
            {label}
          </div>
        </div>
        {rightHint ? (
          <div className={cn("shrink-0 font-normal text-[#1f2f46]", FONT_BASE)}>
            {rightHint}
          </div>
        ) : null}
      </div>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

function Grid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("grid grid-cols-12 gap-4", className)}>{children}</div>;
}

function Col({
  span,
  children,
  className,
}: {
  span:
    | "12"
    | "6"
    | "4"
    | "8"
    | "3"
    | "9"
    | "5"
    | "7"
    | "2"
    | "10"
    | "11";
  children: React.ReactNode;
  className?: string;
}) {
  const map: Record<string, string> = {
    "12": "col-span-12",
    "11": "col-span-12 xl:col-span-11",
    "10": "col-span-12 xl:col-span-10",
    "9": "col-span-12 xl:col-span-9",
    "8": "col-span-12 xl:col-span-8",
    "7": "col-span-12 lg:col-span-7",
    "6": "col-span-12 lg:col-span-6",
    "5": "col-span-12 lg:col-span-5",
    "4": "col-span-12 lg:col-span-4",
    "3": "col-span-12 lg:col-span-3",
    "2": "col-span-12 lg:col-span-2",
  };
  return <div className={cn(map[span], className)}>{children}</div>;
}

// ----------------------------------------------------------------------
// Radio：支持 nowrap（但家庭收入我们会给足宽度，尽量不需要滚动）
// ----------------------------------------------------------------------

// 找到 InlineRadioGroup 函数，替换为以下内容：

function InlineRadioGroup({
  value,
  onValueChange,
  options,
  disabled,
  nowrap = false,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  disabled: boolean;
  nowrap?: boolean;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => !disabled && onValueChange(v)}
      className={cn(
        "flex items-center gap-3",
        nowrap ? "flex-nowrap overflow-x-auto pb-1" : "flex-wrap"
      )}
    >
      {options.map((opt, idx) => {
        const id = `ir-${opt}-${idx}`;
        return (
          <label
            key={id}
            className={cn(
              // 修改点 1: 加入 CONTROL_H (h-8) 强制高度与输入框一致
              // 修改点 2: 去掉 py-1，改为 flex 垂直居中
              // 修改点 3: 将 px-3 改为 px-2，与输入框 (Input) 的内边距保持一致
              CONTROL_H,
              "shrink-0 flex items-center gap-2 border border-[#8fb0d4] bg-white px-2", 
              "hover:bg-[#eef5ff]",
              disabled ? "opacity-70" : "cursor-pointer"
            )}
          >
            <RadioGroupItem id={id} value={opt} disabled={disabled} />
            {/* 修改点：确保这里也使用 text-[12px] 并加上 leading-none 与输入框保持一致 */}
            <span className="whitespace-nowrap text-[#0f172a] text-[12px] leading-none">
              {opt}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

// ----------------------------------------------------------------------
// CodeBoxes：患者ID/姓名缩写用
// ----------------------------------------------------------------------

function CodeBoxesInput({
  length,
  value,
  onChange,
  disabled,
  ariaLabel,
  className,
}: {
  length: number;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  ariaLabel?: string;
  className?: string;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const safe = (value ?? "").toString();
  const chars = Array.from({ length }).map((_, i) => safe[i] ?? "");

  const focusAt = (i: number) => {
    const el = refs.current[i];
    if (el) el.focus();
  };

  const setChar = (idx: number, ch: string) => {
    const arr = Array.from({ length }).map((_, i) => safe[i] ?? "");
    arr[idx] = ch;
    onChange(arr.join("").slice(0, length));
  };

  return (
    <div
      className={cn("inline-flex flex-wrap items-center gap-1", className)}
      aria-label={ariaLabel}
    >
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          disabled={disabled}
          value={chars[i]}
          inputMode="text"
          autoComplete="off"
          maxLength={1}
          className={cn(
            CONTROL_H,
            // 修改点：加入 !text-[12px] 和 leading-none，确保字体小且垂直对齐
            "w-7 border-0 rounded-none bg-white text-center font-mono outline-none !text-[12px] leading-none",
            // FONT_BASE, // 可以去掉这个，因为前面已经强制写了 !text-[12px]
            "ring-1 ring-inset ring-[#8fb0d4]",
            "focus:ring-2 focus:ring-[#7aa6d9]",
            disabled ? "bg-[#f1f5f9] text-[#475569]" : ""
          )}
          onChange={(e) => {
            if (disabled) return;
            const v = e.target.value;
            const ch = v ? v.slice(-1) : "";
            setChar(i, ch);
            if (ch && i < length - 1) focusAt(i + 1);
          }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Backspace") {
              if (!chars[i] && i > 0) {
                e.preventDefault();
                setChar(i - 1, "");
                focusAt(i - 1);
              } else {
                e.preventDefault();
                setChar(i, "");
              }
            } else if (e.key === "ArrowLeft" && i > 0) {
              e.preventDefault();
              focusAt(i - 1);
            } else if (e.key === "ArrowRight" && i < length - 1) {
              e.preventDefault();
              focusAt(i + 1);
            }
          }}
          onPaste={(e) => {
            if (disabled) return;
            const text = e.clipboardData.getData("text") ?? "";
            if (!text) return;
            e.preventDefault();
            const cleaned = text.replace(/\s+/g, "").slice(0, length - i);
            if (!cleaned) return;
            const arr = Array.from({ length }).map((_, k) => safe[k] ?? "");
            for (let k = 0; k < cleaned.length; k++) arr[i + k] = cleaned[k];
            onChange(arr.join("").slice(0, length));
            focusAt(Math.min(i + cleaned.length, length - 1));
          }}
        />
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------
// 主组件
// ----------------------------------------------------------------------

export function CrfE2C2({
  data,
  isEditing,
  values,
  onChange,
  highlightKey,
  onHoverKey,
  actionToolbar, // ✅ 新增
}: FormProps) {
  const dataMap = useMemo(() => {
    const m: Record<string, any> = {};
    (data as DataItem[]).forEach((f) => {
      if (f?.key) m[f.key] = f.value;
    });
    return m;
  }, [data]);

  const getValue = useCallback(
    (key: FieldKey) => {
      const vEdit = values?.[key];
      const vData = dataMap[key];
      return isEditing ? (vEdit ?? vData ?? "") : (vData ?? vEdit ?? "");
    },
    [dataMap, isEditing, values]
  );

  const setField = useCallback(
    (key: FieldKey, value: any) => {
      if (!isEditing) return;
      onChange(key, value);
    },
    [isEditing, onChange]
  );

// 找到 renderTextInput 函数，修改 className 部分：

  const renderTextInput = (
    key: FieldKey,
    widthClass = "w-full",
    placeholder = ""
  ) => {
    const val = String(getValue(key) ?? "");
    return (
      <Input
        value={val}
        disabled={!isEditing}
        placeholder={placeholder}
        onChange={(e) => setField(key, e.target.value)}
        className={cn(
          CONTROL_H,
          // 修改点：使用 !text-[12px] 强制覆盖默认的 text-sm，并加上 leading-none 确保对齐
          "!text-[12px] leading-none", 
          BORDER,
          "bg-white px-2",
          "placeholder:text-[#94a3b8]",
          FOCUS,
          !isEditing ? DISABLED : "",
          widthClass
        )}
      />
    );
  };

  const renderDateInput = (key: FieldKey) => {
    const val = String(getValue(key) ?? "");
    return (
      <Input
        type="date"
        value={val}
        disabled={!isEditing}
        onChange={(e) => setField(key, e.target.value)}
        className={cn(
          CONTROL_H,
          FONT_BASE,
          BORDER,
          "bg-white px-2 font-mono",
          FOCUS,
          !isEditing ? DISABLED : ""
        )}
      />
    );
  };

  const renderGridRadio = (
    key: FieldKey,
    options: string[],
    columns: 1 | 2 | 3 = 2
  ) => {
    const v = String(getValue(key) ?? "");
    const gridCols =
      columns === 1
        ? "grid-cols-1"
        : columns === 2
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

    return (
      <RadioGroup
        value={v}
        onValueChange={(nv) => setField(key, nv)}
        className={cn("grid gap-2", gridCols)}
      >
        {options.map((opt, idx) => {
          const id = `gr-${key}-${idx}`;
          return (
            <label
              key={id}
              className={cn(
                "flex items-start gap-2 border border-[#8fb0d4] bg-white px-3 py-2",
                "hover:bg-[#eef5ff]",
                !isEditing ? "opacity-70" : "cursor-pointer"
              )}
            >
              <RadioGroupItem
                id={id}
                value={opt}
                disabled={!isEditing}
                className="mt-[2px]"
              />
              <span className={cn("leading-5 text-[#0f172a]", FONT_BASE)}>
                {opt}
              </span>
            </label>
          );
        })}
      </RadioGroup>
    );
  };

  const renderNameAbbre = () => {
    const key: FieldKey = "name_abbre";
    const val = String(getValue(key) ?? "");
    return (
      <CodeBoxesInput
        length={4}
        value={val}
        disabled={!isEditing}
        onChange={(nv) => setField(key, nv)}
        ariaLabel="姓名缩写"
      />
    );
  };

  const renderPatientId = () => {
    const key: FieldKey = "outp_num";
    const raw = String(getValue(key) ?? "");
    const { prefix, suffix } = splitPatientId(raw);

    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CodeBoxesInput
            length={PATIENT_PREFIX_LEN}
            value={prefix}
            disabled={!isEditing}
            onChange={(p) => setField(key, joinPatientId(p, suffix))}
            ariaLabel="中心编号"
          />
          <span className="font-bold text-[#0f172a]">-</span>
          <Input
            value={suffix}
            disabled={!isEditing}
            onChange={(e) => setField(key, joinPatientId(prefix, e.target.value))}
            placeholder="住院/门诊ID"
            className={cn(
              CONTROL_H,
              // 修改点：这里原来是 FONT_BASE，改为 !text-[12px] leading-none
              "!text-[12px] leading-none",
              BORDER,
              "bg-white px-2 font-mono placeholder:text-[#94a3b8]",
              FOCUS,
              !isEditing ? DISABLED : "",
              "w-56"
            )}
          />
        </div>

        <div className="text-[#64748b]">中心编号 + 住院/门诊 ID</div>
      </div>
    );
  };

  const majorPaymentVal = String(getValue("major_payment") ?? "");

  // 顶部按钮：更贴近截图（小矩形、轻微立体、克制配色）
  const topBtnCls = cn(
    // 1. 尺寸与形状
    "h-[23px] px-3 py-0", // 高度调矮，内边距适中，去掉默认py
    "rounded-[2px]", // 极小的圆角，几乎是直角

    // 2. 边框：一种中等深度的蓝灰色
    "border border-[#7ca0b9]", 

    // 3. 核心渐变：从纯白到淡蓝灰 (还原图片那种微微发紫/蓝的感觉)
    // 这里的颜色关键是底部的 #e0e6f5
    "bg-gradient-to-b from-[#ffffff] to-[#e0e6f5]",

    // 4. 文字：深蓝紫色，粗体，小字号
    "text-[11px] font-bold text-[#1e2f50]", 
    "leading-[21px]", // 确保文字垂直居中

    // 5. 内部高光与阴影：顶部有一条白线让它看起来凸起
    "shadow-[inset_0_1px_0_#ffffff]",

    // 6. 交互状态
    "hover:brightness-[0.98] hover:border-[#6589a1]", // 悬停略微变暗
    "active:from-[#dbe2f1] active:to-[#ffffff] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]", // 点击反转渐变

    // 7. 布局
    "inline-flex items-center justify-center whitespace-nowrap transition-all duration-100"
  );

  const dangerBtnCls = topBtnCls;



  // const TopActions = (
  //   <div className="flex flex-wrap items-center gap-2">
  //     <Button type="button" className={topBtnCls} onClick={() => {}}>
  //       保存
  //     </Button>
  //     <Button type="button" className={topBtnCls} onClick={() => {}}>
  //       撤回
  //     </Button>
  //     <Button type="button" className={topBtnCls} onClick={() => {}}>
  //       重做
  //     </Button>
  //     <Button type="button" className={dangerBtnCls} onClick={() => {}}>
  //       清空
  //     </Button>
  //   </div>
  // );

  return (
    <PageFrame>
      <HeaderBar title="一、基本信息（CRF-E2-C2）" right={actionToolbar ?? null} />

      {/* 人口学信息：长方形外框（无圆角） */}
      <SectionPanel title="1.1 人口学信息">
        <Grid className="items-start">
          <Col span="12">
            <FieldBlock
              label="患者 ID"
              required
              fieldKey="outp_num"
              onHoverKey={onHoverKey}
              active={highlightKey === "outp_num"}
              rightHint={!isEditing ? "只读" : null}
            >
              {renderPatientId()}
            </FieldBlock>
          </Col>

          <Col span="3">
            <FieldBlock
              label="姓名（缩写）"
              fieldKey="name_abbre"
              onHoverKey={onHoverKey}
              active={highlightKey === "name_abbre"}
            >
              {renderNameAbbre()}
            </FieldBlock>
          </Col>

          <Col span="3">
            <FieldBlock
              label="出生年月"
              fieldKey="birth"
              onHoverKey={onHoverKey}
              active={highlightKey === "birth"}
            >
              {renderDateInput("birth")}
            </FieldBlock>
          </Col>

          <Col span="3">
            <FieldBlock
              label="性别"
              required
              fieldKey="sex"
              onHoverKey={onHoverKey}
              active={highlightKey === "sex"}
            >
              <InlineRadioGroup
                value={String(getValue("sex") ?? "")}
                onValueChange={(v) => setField("sex", v)}
                options={["男", "女"]}
                disabled={!isEditing}
                nowrap
              />
            </FieldBlock>
          </Col>

          <Col span="3">
            <FieldBlock
              label="民族"
              fieldKey="nation"
              onHoverKey={onHoverKey}
              active={highlightKey === "nation"}
            >
              {renderTextInput("nation", "max-w-[180px]", "如：汉")}
            </FieldBlock>
          </Col>

          <Col span="6">
            <FieldBlock
              label="患者来源"
              fieldKey="patient_sou"
              onHoverKey={onHoverKey}
              active={highlightKey === "patient_sou"}
            >
              <InlineRadioGroup
                value={String(getValue("patient_sou") ?? "")}
                onValueChange={(v) => setField("patient_sou", v)}
                options={["门诊", "住院"]}
                disabled={!isEditing}
              />
            </FieldBlock>
          </Col>

          <Col span="6">
            <FieldBlock
              label="首诊"
              fieldKey="fir_diag"
              onHoverKey={onHoverKey}
              active={highlightKey === "fir_diag"}
            >
              <InlineRadioGroup
                value={String(getValue("fir_diag") ?? "")}
                onValueChange={(v) => setField("fir_diag", v)}
                options={["是", "否"]}
                disabled={!isEditing}
              />
            </FieldBlock>
          </Col>

          <Col span="12">
            <FieldBlock
              label="职业（退休前职业）"
              fieldKey="job"
              onHoverKey={onHoverKey}
              active={highlightKey === "job"}
            >
              {renderGridRadio(
                "job",
                [
                  "国家机关、党群组织、企业、事业单位负责人",
                  "专业技术人员",
                  "办事人员和有关人员",
                  "商业、服务业人员",
                  "农、林、牧、渔、水利业生产人员",
                  "生产、运输设备操作人员及有关人员",
                  "军人",
                  "不便分类的其他从业人员",
                ],
                2
              )}
            </FieldBlock>
          </Col>

          {/* (2) 家庭收入组件整体加宽：独占一行，尽量不出现横向滚动 */}
          <Col span="12">
            <FieldBlock
              label="家庭收入（年）"
              fieldKey="hou_inco"
              onHoverKey={onHoverKey}
              active={highlightKey === "hou_inco"}
            >
              <InlineRadioGroup
                value={String(getValue("hou_inco") ?? "")}
                onValueChange={(v) => setField("hou_inco", v)}
                options={["10万以上", "5-10万", "3-5万", "3万以下"]}
                disabled={!isEditing}
                // 这里不强制 nowrap，让它自然换行，结合更宽的行避免滚动条
                nowrap={false}
              />
            </FieldBlock>
          </Col>

          <Col span="12">
            <FieldBlock
              label="主要医疗付费方式"
              fieldKey="major_payment"
              onHoverKey={onHoverKey}
              active={highlightKey === "major_payment"}
            >
              <div className="space-y-2">
                {renderGridRadio(
                  "major_payment",
                  [
                    "城镇职工基本医疗保险",
                    "新城镇居民基本医疗保险",
                    "新型农村合作医疗",
                    "商业医疗保险",
                    "全公费",
                    "全自费",
                    "其他社会保险",
                    "贫困救助",
                    "其他",
                  ],
                  2
                )}

                {majorPaymentVal === "其他" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("font-semibold text-[#1f2f46]", FONT_BASE)}>
                      请填写：
                    </span>
                    {renderTextInput("major_payment_other", "max-w-[420px]", "")}
                  </div>
                ) : null}
              </div>
            </FieldBlock>
          </Col>
        </Grid>
      </SectionPanel>

      {/* 通讯及联系方式：同样长方形外框（无圆角） */}
      <SectionPanel title="1.2 通讯及联系方式">
        <Grid>
          <Col span="12">
            <FieldBlock
              label="常住地址"
              fieldKey="provi"
              onHoverKey={onHoverKey}
              active={highlightKey === "provi"}
              rightHint={<span>省 / 市 / 区县 / 街道</span>}
            >
              <div className="space-y-2">
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                  <div className="min-w-[160px] flex-1">
                    {renderTextInput("provi", "w-full", "省")}
                  </div>
                  <div className="min-w-[160px] flex-1">
                    {renderTextInput("city", "w-full", "市")}
                  </div>
                  <div className="min-w-[160px] flex-1">
                    {renderTextInput("district", "w-full", "区/县")}
                  </div>
                </div>
                <div>{renderTextInput("road", "w-full", "街道/村")}</div>
              </div>
            </FieldBlock>
          </Col>

          <Col span="4">
            <FieldBlock
              label="联系手机 1"
              fieldKey="phone1"
              onHoverKey={onHoverKey}
              active={highlightKey === "phone1"}
            >
              {renderTextInput("phone1", "w-full", "")}
            </FieldBlock>
          </Col>

          <Col span="4">
            <FieldBlock
              label="联系手机 2"
              fieldKey="phone2"
              onHoverKey={onHoverKey}
              active={highlightKey === "phone2"}
            >
              {renderTextInput("phone2", "w-full", "")}
            </FieldBlock>
          </Col>

          <Col span="4">
            <FieldBlock
              label="微信号"
              fieldKey="wechat"
              onHoverKey={onHoverKey}
              active={highlightKey === "wechat"}
            >
              {renderTextInput("wechat", "w-full", "")}
            </FieldBlock>
          </Col>
        </Grid>
      </SectionPanel>

      <div className="pt-2 text-center text-[#94a3b8]">crf_e2_c2</div>
    </PageFrame>
  );
}
