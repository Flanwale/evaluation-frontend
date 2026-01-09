"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CrfE2C2 } from "@/components/forms/crf-e2-c2";
import { PhotoIntakeDemoModal } from "@/components/document-intake/photo-intake-demo-modal";
import { cn } from "@/lib/utils";
import { Camera, Eye, Pencil, RotateCcw } from "lucide-react";

type AnyObj = Record<string, any>;

const CRF_KEYS = [
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
  "major_payment_other",
  "provi",
  "city",
  "district",
  "road",
  "phone1",
  "phone2",
  "wechat",
];

const DEMO_VALUES: AnyObj = {
  outp_num: "1234567",
  name_abbre: "ZHWN",
  sex: "女",
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

export default function DemoCrfE2C2Page() {
  const [isEditing, setIsEditing] = useState(true);
  const [values, setValues] = useState<AnyObj>(() => {
    // 初始为空，老师看得更清楚；也可以默认填 DEMO_VALUES
    const empty: AnyObj = {};
    CRF_KEYS.forEach((k) => (empty[k] = ""));
    return empty;
  });

  const [photoOpen, setPhotoOpen] = useState(false);

  // 你的 CrfE2C2 在 isEditing=false 时会从 data 里读 value；
  // 所以这里给一份 data 镜像，保证“预览模式”也能显示当前 values
  const dataForPreview = useMemo(() => {
    return CRF_KEYS.map((k) => ({ key: k, value: values[k] }));
  }, [values]);

  const onChange = (key: string, value: any) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const applyExtracted = (extracted: AnyObj) => {
    // 只写回 CRF_KEYS 内的字段，避免脏写
    setValues((prev) => {
      const next = { ...prev };
      Object.entries(extracted || {}).forEach(([k, v]) => {
        if (CRF_KEYS.includes(k)) next[k] = v;
      });
      return next;
    });
  };

  const resetEmpty = () => {
    const empty: AnyObj = {};
    CRF_KEYS.forEach((k) => (empty[k] = ""));
    setValues(empty);
  };

  const fillDemo = () => setValues((prev) => ({ ...prev, ...DEMO_VALUES }));

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <div className="text-xl font-bold text-slate-900">CRF 演示：E2C2 基本信息</div>
            <div className="text-sm text-slate-500 mt-1">
              纯前端演示版：拍照录入 →（模拟）解析 → Extract → 写回表格
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing((v) => !v)}
              className="h-9"
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4 mr-2" /> 切到预览
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4 mr-2" /> 切到编辑
                </>
              )}
            </Button>

            <Button variant="outline" onClick={resetEmpty} className="h-9">
              <RotateCcw className="w-4 h-4 mr-2" />
              清空
            </Button>

            <Button variant="outline" onClick={fillDemo} className="h-9">
              填充演示数据
            </Button>

            <Button
              className={cn("h-9 bg-blue-600 hover:bg-blue-700")}
              onClick={() => setPhotoOpen(true)}
            >
              <Camera className="w-4 h-4 mr-2" />
              拍照录入
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
          <Card className="p-3 sm:p-4 overflow-hidden">
            <CrfE2C2
              data={dataForPreview}
              isEditing={isEditing}
              values={values}
              onChange={onChange}
            />
          </Card>

          <Card className="p-4 h-fit">
            <div className="text-sm font-semibold text-slate-800">当前 values（给老师看写回效果）</div>
            <div className="text-xs text-slate-500 mt-1">
              拍照录入写回后，这里会同步变化
            </div>
            <pre className="mt-3 text-xs bg-slate-50 border rounded-lg p-3 overflow-auto max-h-[70vh]">
{JSON.stringify(values, null, 2)}
            </pre>
          </Card>
        </div>
      </div>

      <PhotoIntakeDemoModal
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        // ✅ 传入你当前 CRF 的 key，弹窗里会自动“可写回/不可写回”标记
        allowedKeys={CRF_KEYS}
        onApply={applyExtracted}
      />
    </div>
  );
}
