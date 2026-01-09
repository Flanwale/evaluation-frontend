"use client";

// src/components/forms/crf-table-view.tsx
import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { CrfSchema } from "@/components/forms/crf-schemas";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BackendField = { key: string; label?: string; value?: any };

type Props = {
  data: BackendField[];
  values?: Record<string, any>;
  isEditing?: boolean;
  onChange?: (key: string, value: any) => void;

  schema?: CrfSchema;

  /** ✅ hover 联动 */
  highlightKey?: string | null;
  onHoverKeyChange?: (key: string | null) => void;

  /** ✅ 默认不显示 computed（__xxx），避免“图片里没有但表格出现” */
  includeComputed?: boolean;

  /** ✅ 默认不显示 key 小字，避免拥挤；调试时可打开 */
  showKeyHint?: boolean;

  className?: string;
};

function normalizeToMap(data: BackendField[]): Record<string, any> {
  const m: Record<string, any> = {};
  for (const f of data || []) {
    if (!f || !f.key) continue;
    m[f.key] = f.value;
  }
  return m;
}

function toStr(v: any) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function uniq(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!x) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

export function CrfTableView({
  data,
  values,
  isEditing = true,
  onChange,
  schema,
  highlightKey,
  onHoverKeyChange,
  includeComputed = false,
  showKeyHint = false,
  className,
}: Props) {
  const backendMap = useMemo(() => normalizeToMap(data || []), [data]);

  // ✅ valuesMap：computed 字段要用它来 compute（编辑实时值优先）
  const valuesMap = useMemo(() => {
    return { ...backendMap, ...(values || {}) };
  }, [backendMap, values]);

  const schemaFields = schema?.fields || {};
  const whitelistSet = useMemo(() => {
    if (!schema?.whitelistKeys?.length) return null;
    return new Set<string>(schema.whitelistKeys);
  }, [schema?.whitelistKeys]);

  // ✅ 排序：严格按 schema.sections[].fields（你 schema 就是这么定义顺序的）
  const sectionOrderKeys = useMemo(() => {
    if (!schema?.sections?.length) return [];
    return uniq(schema.sections.flatMap((s) => s.fields || []).filter(Boolean));
  }, [schema?.sections]);

  const rows = useMemo(() => {
    const dataKeys = uniq((data || []).map((f) => f?.key).filter(Boolean));

    // 没 schema：就按后端 data 的 key 展示
    if (!schema) {
      return dataKeys.map((k) => {
        const fromData = (data || []).find((f) => f.key === k);
        return {
          key: k,
          label: fromData?.label || k,
          meta: {},
          fromData,
        };
      });
    }

    const ordered = uniq([...sectionOrderKeys, ...dataKeys]);

    const out = ordered
      .map((k) => {
        const fromData = (data || []).find((f) => f.key === k);
        const meta = (schemaFields as any)?.[k] || {};
        const label = meta?.label || fromData?.label || k;
        return { key: k, label, meta, fromData };
      })
      .filter((r) => !!r.key);

    // ✅ 过滤策略（你问“这些 key 在哪删”）：
    // - 默认：只显示 whitelistKeys 里出现的 key（即“图片里出现的字段”）
    // - computed（__xxx 或 meta.type===computed）：默认隐藏（includeComputed=false）
    return out.filter((r) => {
      const isComputed =
        r.key.startsWith("__") || String(r.meta?.type || "") === "computed";

      if (isComputed && !includeComputed) return false;

      // whitelist 存在时，只放行 whitelist 内（computed 除外，已在上面处理）
      if (whitelistSet) {
        return whitelistSet.has(r.key);
      }
      return true;
    });
  }, [data, schema, schemaFields, sectionOrderKeys, whitelistSet, includeComputed]);

  const getValue = (key: string) => {
    const v = values?.[key];
    if (v !== undefined) return v;
    return backendMap[key];
  };

  const setValue = (key: string, v: any) => {
    onChange?.(key, v);
  };

  const renderComputed = (meta: any) => {
    const compute = meta?.compute;
    if (typeof compute !== "function") return "";
    try {
      return toStr(compute(valuesMap));
    } catch {
      return "";
    }
  };

  const renderEditor = (key: string, meta: any) => {
    // ✅ computed 永远只读（编辑态也不允许输入）
    if (String(meta?.type || "") === "computed" || key.startsWith("__")) {
      const s = renderComputed(meta);
      return (
        <div className="text-slate-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {s || <span className="text-slate-400">-</span>}
        </div>
      );
    }

    const v = getValue(key);
    const options: string[] = Array.isArray(meta?.options) ? meta.options : [];

    // ✅ 有 options：渲染下拉
    if (options.length > 0) {
      const sv = toStr(v);
      const selectValue = sv ? sv : undefined;

      return (
        <Select
          value={selectValue as any}
          onValueChange={(val) => {
            if (val === "__clear__") setValue(key, "");
            else setValue(key, val);
          }}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="请选择" />
          </SelectTrigger>

          <SelectContent className="max-h-[320px]">
            <SelectItem value="__clear__">清空</SelectItem>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    const type = meta?.type;
    const inputType =
      type === "date" ? "date" : type === "number" ? "number" : "text";

    return (
      <Input
        className="h-9"
        type={inputType}
        value={toStr(v)}
        onChange={(e) => setValue(key, e.target.value)}
      />
    );
  };

  const renderReadOnly = (key: string, meta: any) => {
    if (String(meta?.type || "") === "computed" || key.startsWith("__")) {
      const s = renderComputed(meta);
      return (
        <div className="text-slate-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {s || <span className="text-slate-400">-</span>}
        </div>
      );
    }

    const v = getValue(key);
    const s = toStr(v);
    return (
      <div className="text-slate-800 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {s || <span className="text-slate-400">-</span>}
      </div>
    );
  };

  return (
    <div className={cn("h-full min-h-0 w-full min-w-0 overflow-auto", className)}>
      <Table className="min-w-[780px]">
        <TableHeader className="sticky top-0 z-10 bg-white">
          <TableRow>
            <TableHead className="w-[280px]">字段</TableHead>
            <TableHead>值</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((r) => {
            const active = !!highlightKey && r.key === highlightKey;

            return (
              <TableRow
                key={r.key}
                className={cn("align-top", active && "bg-yellow-100/70")}
                onMouseEnter={() => onHoverKeyChange?.(r.key)}
                onMouseLeave={() => onHoverKeyChange?.(null)}
              >
                <TableCell
                  className={cn(
                    "font-medium text-slate-700 whitespace-normal break-words [overflow-wrap:anywhere]",
                    active && "text-slate-900"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <span>{r.label}</span>
                    {showKeyHint && (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {r.key}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell className="whitespace-normal break-words [overflow-wrap:anywhere]">
                  {isEditing ? renderEditor(r.key, r.meta) : renderReadOnly(r.key, r.meta)}
                </TableCell>
              </TableRow>
            );
          })}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center text-slate-500">
                暂无字段
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
