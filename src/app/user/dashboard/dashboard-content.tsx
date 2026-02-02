// app/user/dashboard/dashboard-content.tsx

"use client";


import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Patient, CrfFieldData, CrfMeta } from "@/types/clinical";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  Save,
  Trash2,
  Search,
  Plus,
  Loader2,
  Camera,
  PencilLine,
  Table2,
  LayoutTemplate,
  RotateCcw,
  RotateCw,
  RefreshCcw,
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCrfHistory } from "@/hooks/use-crf-history";
import { CrfE2C2 } from "@/components/forms/crf-e2-c2";
import { PatientSwitcher } from "@/components/patient-switcher";
import { CrfTableView } from "@/components/forms/crf-table-view";
import { useVisit } from "@/components/edc/visit-context";
import { PhotoIntakeInlineDemo } from "@/components/document-intake/photo-intake-inline-demo";
import { CRF_E2C2_SCHEMA } from "@/components/forms/crf-schemas";
import { DEMO_PATIENTS, DEMO_CRF_FIELDS } from "./demo";
import RiskView from "./risk-view";



/** ======= 页面主体 ======= */
export default function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const patientId = searchParams.get("patientId");
  const viewParam = searchParams.get("view");
  const activeTab = viewParam === "detail" ? "detail" : viewParam === "risk" ? "risk" : "list";

  const { structure, loadingStructure, selectedEvent, selectedCrfCode } = useVisit();

  const selectedCrf: CrfMeta | null = useMemo(() => {
    if (!selectedEvent || !selectedCrfCode) return null;
    const evt = (structure || []).find((e: any) => e.event_code === selectedEvent);
    return evt?.crfs?.find((c: any) => c.code === selectedCrfCode) ?? null;
  }, [structure, selectedEvent, selectedCrfCode]);

  // patients
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // form data
  const [crfData, setCrfData] = useState<CrfFieldData[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [isEditing] = useState(true);
  // const [editValues, setEditValues] = useState<Record<string, any>>({});
  // ✅ 2. 使用 Hook 接管状态
  const { 
    values: editValues,    // 把 hook 里的 values 改名为 editValues 以兼容你原本的代码
    setValue: updateHistoryValues, 
    undo, 
    redo, 
    initialize, // 用于加载数据
    canUndo, 
    canRedo 
  } = useCrfHistory<Record<string, any>>({});

  // 默认拍照录入
  const [entryMode, setEntryMode] = useState<"photo" | "manual">("photo");

  // 默认表格视图
  const [viewMode, setViewMode] = useState<"table" | "form">("form");

  // add patient
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ subject: "", protocol: "" });

  const activePatient = useMemo(() => {
    return (patients || []).find((p: any) => String(p.id) === String(patientId));
  }, [patients, patientId]);

  // ✅ 识别结果回调
  const applyExtractedFieldsToForm = useCallback(
    (fields: Record<string, any>) => {
      if (!fields) return;
      const allowed = new Set((crfData || []).map((f: any) => f.key));
      const picked: Record<string, any> = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (allowed.has(k)) picked[k] = v;
      });

      if (Object.keys(picked).length === 0) {
        toast.error("识别结果与当前表单字段不匹配");
        return;
      }
      // ⚡️ 变更点：调用 hook 的 update 方法，传入完整的新对象
      updateHistoryValues({ ...editValues, ...picked });
      setViewMode("form");
    },
    [crfData, editValues, updateHistoryValues] // 依赖项更新
  );

  // load patients
  useEffect(() => {
    const initLoad = async () => {
      setLoadingList(true);
      try {
        const pRes = await fetch("/api/patients");
        if (pRes.ok) {
          const pData = await pRes.json();
          setPatients(Array.isArray(pData) ? pData : []);
        } else {
          setPatients(DEMO_PATIENTS);
        }
      } catch {
        setPatients(DEMO_PATIENTS);
        toast.message("后端不可用：已切换到演示患者数据");
      } finally {
        setLoadingList(false);
      }
    };
    initLoad();
  }, []);

  const loadCrfData = useCallback(async (pId: string, eCode: string, cCode: string) => {
    setLoadingData(true);
    // setEditValues({});
    setViewMode("form"); // 切换患者时重置为表格
    try {
      const res = await fetch(`/api/crf/${pId}/${eCode}/${cCode}`);
      if (res.ok) {
        const json = await res.json();
        const fields = json?.fields || [];
        setCrfData(fields);

        const init: Record<string, any> = {};
        (fields || []).forEach((f: any) => (init[f.key] = f.value));
        initialize(init); 
      } else {
        setCrfData(DEMO_CRF_FIELDS);
        const init: Record<string, any> = {};
        DEMO_CRF_FIELDS.forEach((f: any) => (init[f.key] = f.value));
        initialize(init); 
        toast.message("表单接口不可用：已切换到演示 CRF 数据");
      }
    } catch {
      setCrfData(DEMO_CRF_FIELDS);
      const init: Record<string, any> = {};
      DEMO_CRF_FIELDS.forEach((f: any) => (init[f.key] = f.value));
      initialize(init); 
      toast.message("表单接口不可用：已切换到演示 CRF 数据");
    } finally {
      setLoadingData(false);
    }
  }, [initialize]);

  useEffect(() => {
    if (activeTab !== "detail") return;

    if (patientId && selectedEvent && selectedCrf?.code) {
      loadCrfData(patientId, selectedEvent, selectedCrf.code);
      setEntryMode("photo");
      return;
    }

    setCrfData([]);
    // setEditValues({});
    setViewMode("form");
  }, [activeTab, patientId, selectedEvent, selectedCrf?.code, loadCrfData]);

  const handleSaveCrf = async () => {
    if (!patientId || !selectedEvent || !selectedCrf) return;
    const tableName = `crf_${String(selectedEvent).toLowerCase()}_${String(selectedCrf.code).toLowerCase()}`;
    try {
      const res = await fetch(`/api/crf/save/${patientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_name: tableName, data: editValues }),
      });
      const json = await res.json();
      if (json?.success) toast.success("保存成功");
      else toast.error("保存失败");
    } catch {
      toast.message("（演示）保存请求已触发");
    }
  };

  const handleDataChange = (key: string, value: any) => {
    updateHistoryValues({ ...editValues, [key]: value });
  };

  const handleAddPatient = async () => {
    if (!newPatient.subject) return toast.error("请输入编号");
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_label: newPatient.subject,
          protocol_id: newPatient.protocol,
        }),
      });
      const json = await res.json();
      if (json?.success) {
        toast.success("添加成功");
        setNewPatientOpen(false);
        const pRes = await fetch("/api/patients");
        const list = await pRes.json();
        setPatients(Array.isArray(list) ? list : []);
        router.push(`/user/dashboard?view=detail&patientId=${json.id}`);
      } else {
        toast.error("失败: " + (json?.error || "unknown"));
      }
    } catch {
      const id = `demo-${Date.now()}`;
      const p = {
        id,
        subject_label: newPatient.subject,
        protocol_id: newPatient.protocol,
        created_at: "2025-12-25",
      } as any;
      setPatients((prev) => [p, ...prev]);
      setNewPatientOpen(false);
      router.push(`/user/dashboard?view=detail&patientId=${id}`);
      toast.message("后端不可用：已在前端演示新增患者");
    }
  };
  // ✅ 7. 定义工具栏按钮样式 (复用你之前的样式定义)
  const TOP_BTN_CLS = cn(
    "h-[26px] px-3 py-0 rounded-[2px] border border-[#7ca0b9]",
    "bg-gradient-to-b from-[#ffffff] to-[#e0e6f5]",
    "text-[12px] font-bold text-[#1e2f50] leading-[24px]", // 微调高度对齐
    "shadow-[inset_0_1px_0_#ffffff]",
    "hover:brightness-[0.98] hover:border-[#6589a1]",
    "active:from-[#dbe2f1] active:active:to-[#ffffff]",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "inline-flex items-center justify-center gap-1 transition-all duration-100"
  );


  // 1. 把 loadingData, undo, redo 等作为依赖项
  const ActionToolbar = useMemo(() => (
    <div className="flex flex-wrap items-center gap-2">
      <Button 
        type="button" 
        className={TOP_BTN_CLS} 
        onClick={handleSaveCrf} 
        disabled={loadingData}
      >
        {loadingData ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        保存
      </Button>
      
      <Button 
        type="button" 
        className={TOP_BTN_CLS} 
        onClick={undo}
        disabled={!canUndo}
      >
        <RotateCcw className="h-3 w-3" />
        撤回
      </Button>
      
      <Button 
        type="button" 
        className={TOP_BTN_CLS} 
        onClick={redo}
        disabled={!canRedo}
      >
        <RotateCw className="h-3 w-3" />
        重做
      </Button>

      <Button
        type="button"
        className={TOP_BTN_CLS}
        onClick={() => {
          if (confirm("确定清空当前表单所有字段吗？此操作不可撤销（除非你撤回）")) {
            initialize({} as Record<string, any>); // ✅ 清空：所有字段变空
          }
        }}
      >
        <RefreshCcw className="h-3 w-3" />
        重置
      </Button>

    </div>
  ), [loadingData, undo, redo, canUndo, canRedo, handleSaveCrf, patientId, selectedEvent, selectedCrf, loadCrfData]); 
  // ⬆️ 注意依赖数组，只有这些变了才重新渲染按钮组

  const handleDeletePatient = async (id: string) => {
    if (!confirm("确定要删除吗？此操作不可逆。")) return;
    try {
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json?.success) {
        toast.success("删除成功");
        const pRes = await fetch("/api/patients");
        const list = await pRes.json();
        setPatients(Array.isArray(list) ? list : []);
      } else {
        toast.error("删除失败");
      }
    } catch {
      setPatients((prev) => prev.filter((p: any) => p.id !== id));
      toast.message("后端不可用：已在前端演示删除");
    }
  };

  const handleSwitchPatient = (newId: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("view", "detail");
    current.set("patientId", newId);
    router.push(`${pathname}?${current.toString()}`);
    setViewMode("form");
  };

  const gotoList = () => router.push(`/user/dashboard?view=list`);
  const gotoDetail = (id: string) => router.push(`/user/dashboard?view=detail&patientId=${id}`);

  const filteredPatients = patients.filter(
    (p: any) =>
      String(p.subject_label || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(p.protocol_id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ 修改：renderCrfForm 接收高亮 props
  const renderCrfForm = (props?: { highlightKey?: string | null; onHoverKey?: (k: string | null) => void }) => (
    <div className="font-serif">
      <CrfE2C2
        data={crfData}
        isEditing={isEditing}
        values={editValues}
        onChange={handleDataChange}
        // 透传高亮 props
        highlightKey={props?.highlightKey}
        onHoverKey={props?.onHoverKey}
        actionToolbar={ActionToolbar} // <--- 关键：传入按钮组
      />
    </div>
  );

  const PhotoIntakeAny = PhotoIntakeInlineDemo as any;
  const PatientSwitcherAny = PatientSwitcher as any;

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* ===== list ===== */}
      {activeTab === "list" && (
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-800">患者列表</span>
              {loadingList && (
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  加载中
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-[320px] max-w-[60vw]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-9"
                  placeholder="搜索编号 / 协议号"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => setNewPatientOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                新增
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-auto p-6">
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">编号</TableHead>
                    <TableHead className="w-[220px]">协议</TableHead>
                    <TableHead className="w-[180px]">创建时间</TableHead>
                    <TableHead className="text-right w-[200px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((p: any) => (
                    <TableRow key={p.id} className="cursor-pointer" onClick={() => gotoDetail(p.id)}>
                      <TableCell className="font-medium">{p.subject_label || "-"}</TableCell>
                      <TableCell>{p.protocol_id || "-"}</TableCell>
                      <TableCell>{p.created_at || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => gotoDetail(p.id)}>
                            进入
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleDeletePatient(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loadingList && filteredPatients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        暂无数据
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
          <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>新增患者</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>编号（subject_label）</Label>
                  <Input
                    value={newPatient.subject}
                    onChange={(e) => setNewPatient((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="例如 S-003"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>协议号（protocol_id）</Label>
                  <Input
                    value={newPatient.protocol}
                    onChange={(e) => setNewPatient((prev) => ({ ...prev, protocol: e.target.value }))}
                    placeholder="例如 PROT-2025"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setNewPatientOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddPatient} className="gap-2">
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      )}
      {/* ===== risk ===== */}
      {activeTab === "risk" && <RiskView patients={patients} loadingPatients={loadingList} />}

      {/* ===== detail ===== */}
      {activeTab === "detail" && (
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="outline" size="sm" onClick={gotoList}>
                返回列表
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="min-w-[200px] max-w-[220px] shrink-0">
                <PatientSwitcherAny
                  patients={patients ?? []}
                  value={patientId ?? ""}
                  loading={loadingList}
                  onSelect={handleSwitchPatient}
                  onChange={handleSwitchPatient}
                />
              </div>
              <div className="text-xs text-slate-600 truncate">
                当前患者：<span className="font-semibold">{activePatient?.subject_label || "-"}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div className="text-xs text-slate-600 min-w-0 truncate">
                {loadingStructure ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    加载访视结构…
                  </span>
                ) : selectedEvent && selectedCrf ? (
                  <span className="truncate">
                    当前 CRF：<span className="font-semibold">{selectedEvent}</span> /{" "}
                    <span className="font-semibold">{selectedCrf.code}</span>{" "}
                    {selectedCrf.name ? `（${selectedCrf.name}）` : ""}
                  </span>
                ) : (
                  <span className="text-amber-600">请先在左侧访视结构中选择 Event/CRF</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                <Button
                  variant={entryMode === "photo" ? "default" : "ghost"}
                  size="sm"
                  className={cn("gap-2", entryMode === "photo" ? "" : "text-slate-700")}
                  onClick={() => setEntryMode("photo")}
                >
                  <Camera className="h-4 w-4" />
                  拍照录入
                </Button>
                <Button
                  variant={entryMode === "manual" ? "default" : "ghost"}
                  size="sm"
                  className={cn("gap-2", entryMode === "manual" ? "" : "text-slate-700")}
                  onClick={() => setEntryMode("manual")}
                >
                  <PencilLine className="h-4 w-4" />
                  手动录入
                </Button>
              </div>
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  className={cn("gap-2", viewMode === "table" ? "" : "text-slate-700")}
                  onClick={() => setViewMode("table")}
                >
                  <Table2 className="h-4 w-4" />
                  表格视图
                </Button>
                <Button
                  variant={viewMode === "form" ? "default" : "ghost"}
                  size="sm"
                  className={cn("gap-2", viewMode === "form" ? "" : "text-slate-700")}
                  onClick={() => setViewMode("form")}
                >
                  <LayoutTemplate className="h-4 w-4" />
                  表单视图
                </Button>
              </div>
              {/* <Button
                className="gap-2"
                onClick={handleSaveCrf}
                disabled={!patientId || !selectedEvent || !selectedCrf || loadingData}
              >
                {loadingData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存
              </Button> */}
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            {loadingData && (
              <div className="px-6 py-2 text-xs text-slate-600 bg-white border-b border-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  加载表单字段中…
                </span>
              </div>
            )}

            {!selectedEvent || !selectedCrf ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                请选择一个 Event / CRF 后再录入
              </div>
            ) : (
              <div className="h-full w-full overflow-hidden">
                {entryMode === "manual" && (
                  <div className="h-full w-full overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto p-4 sm:p-6">
                      <div className="mx-auto w-full max-w-[1200px]">
                        {viewMode === "table" ? (
                          <Card className="p-0 overflow-hidden">

                                {/* ✨ 新增：在表格模式顶部也显示工具栏，方便用户撤回 */}
                            <div className="p-2 border-b bg-slate-50 flex justify-end">
                              {ActionToolbar}
                            </div>
                            <div className="max-h-[75vh] min-h-[520px]">
                              <CrfTableView
                                className="h-full"
                                data={crfData}
                                schema={CRF_E2C2_SCHEMA}
                                values={editValues}
                                isEditing={true}
                                onChange={handleDataChange}
                              />
                            </div>
                          </Card>
                        ) : (
                          renderCrfForm()
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {entryMode === "photo" && (
                  <div className="h-full w-full overflow-hidden">
                    <PhotoIntakeAny
                      eventCode={selectedEvent}
                      crfCode={selectedCrf?.code}
                      data={crfData ?? []}
                      fields={crfData ?? []}
                      crfData={crfData ?? []}
                      formFields={crfData ?? []}
                      values={editValues ?? {}}
                      editValues={editValues ?? {}}
                      isEditing={true}
                      onChange={handleDataChange}
                      onApplyExtractedFields={applyExtractedFieldsToForm}
                      applyExtractedFieldsToForm={applyExtractedFieldsToForm}
                      
                      // ✅ 传递 renderPreview 函数而不是静态元素
                      renderPreview={renderCrfForm}
                      
                      className="h-full w-full"
                      rightPanelClassName="min-w-0 flex-1"
                      mode={viewMode}
                      onModeChange={setViewMode}
                      hideModeToggle={true}
                      schema={CRF_E2C2_SCHEMA}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}