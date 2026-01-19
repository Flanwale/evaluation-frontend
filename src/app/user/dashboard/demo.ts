// src/app/user/dashboard/demo.ts
import type { Patient, CrfFieldData } from "@/types/clinical";

export const DEMO_PATIENTS: Patient[] = [
  {
    id: "demo-1",
    subject_label: "S-001",
    protocol_id: "PROT-2025",
    created_at: "2025-12-01",
  } as any,
  {
    id: "demo-2",
    subject_label: "S-002",
    protocol_id: "PROT-2025",
    created_at: "2025-12-02",
  } as any,
];

export const DEMO_CRF_FIELDS: CrfFieldData[] = [
  { key: "outp_num", value: "4567890", label: "住院/门诊ID" } as any,
  { key: "name_abbre", value: "ZHWN", label: "姓名缩写" } as any,
  { key: "sex", value: "女", label: "性别" } as any,
  { key: "nation", value: "汉", label: "民族" } as any,
  { key: "patient_sou", value: "门诊", label: "患者来源" } as any,
  { key: "fir_diag", value: "是", label: "首诊" } as any,
  { key: "birth", value: "1999-07-16", label: "出生年月" } as any,
  { key: "job", value: "专业技术人员", label: "职业" } as any,
  { key: "hou_inco", value: "5-10 万", label: "家庭收入" } as any,
  {
    key: "major_payment",
    value: "新型农村合作医疗",
    label: "主要医疗付费方式",
  } as any,
  { key: "major_payment_other", value: "", label: "主要医疗付费方式-其他" } as any,
  { key: "provi", value: "浙江", label: "省" } as any,
  { key: "city", value: "杭州", label: "市" } as any,
  { key: "district", value: "西湖", label: "区/县" } as any,
  { key: "road", value: "文三路 138 号", label: "街道/村" } as any,
  { key: "phone1", value: "13800138000", label: "联系手机1" } as any,
  { key: "phone2", value: "18600001111", label: "联系手机2" } as any,
  { key: "wechat", value: "demo_wechat_01", label: "微信号" } as any,
];
