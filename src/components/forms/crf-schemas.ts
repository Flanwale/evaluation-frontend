// src/components/forms/crf-schemas.ts
export type CrfFieldType = "text" | "radio" | "date" | "computed";

export type CrfFieldSchema = {
  key: string;
  label: string;
  type: CrfFieldType;
  options?: string[];
  // computed 字段用：从 valuesMap 里拼出展示值
  compute?: (valuesMap: Record<string, any>) => string;
};

export type CrfSectionSchema = {
  id: string;
  title: string;
  fields: string[]; // key 顺序
};

export type CrfSchema = {
  id: string;
  title: string;
  sections: CrfSectionSchema[];
  fields: Record<string, CrfFieldSchema>;
  whitelistKeys: string[]; // 后端返回字段要过滤用
};

// ====== 只保留“图片里出现的字段” ======
export const CRF_E2C2_WHITELIST_KEYS = [
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
] as const;

export const CRF_E2C2_WHITELIST_SET = new Set<string>(CRF_E2C2_WHITELIST_KEYS);

// ====== E2C2 schema：label + 顺序 + 过滤 ======
export const CRF_E2C2_SCHEMA: CrfSchema = {
  id: "crf_e2_c2",
  title: "一、基本信息（E2C2）",
  whitelistKeys: [...CRF_E2C2_WHITELIST_KEYS],

  fields: {
    outp_num: { key: "outp_num", label: "患者ID", type: "text" },
    name_abbre: { key: "name_abbre", label: "姓名（缩写）", type: "text" },
    sex: { key: "sex", label: "性别", type: "radio", options: ["男", "女"] },
    nation: { key: "nation", label: "民族", type: "text" },

    patient_sou: {
      key: "patient_sou",
      label: "患者来源",
      type: "radio",
      options: ["门诊", "住院"],
    },
    fir_diag: {
      key: "fir_diag",
      label: "首诊",
      type: "radio",
      options: ["是", "否"],
    },
    birth: { key: "birth", label: "出生年月", type: "date" },

    job: {
      key: "job",
      label: "职业（退休前职业）",
      type: "radio",
      options: [
        "国家机关、党群组织、企业、事业单位负责人",
        "专业技术人员",
        "办事人员和有关人员",
        "商业、服务业人员",
        "农、林、牧、渔、水利业生产人员",
        "生产、运输设备操作人员及有关人员",
        "军人",
        "不便分类的其他从业人员",
      ],
    },
    hou_inco: {
      key: "hou_inco",
      label: "家庭收入（年）",
      type: "radio",
      options: ["10万以上", "5-10万", "3-5万", "3万以下"],
    },

    major_payment: {
      key: "major_payment",
      label: "主要医疗付费方式",
      type: "radio",
      options: [
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
    },
    major_payment_other: {
      key: "major_payment_other",
      label: "其他（付费方式）",
      type: "text",
    },

    provi: { key: "provi", label: "省", type: "text" },
    city: { key: "city", label: "市", type: "text" },
    district: { key: "district", label: "区/县", type: "text" },
    road: { key: "road", label: "街道/村", type: "text" },

    phone1: { key: "phone1", label: "联系手机1", type: "text" },
    phone2: { key: "phone2", label: "联系手机2", type: "text" },
    wechat: { key: "wechat", label: "微信号", type: "text" },
  },

  sections: [
    {
      id: "sec_1_1",
      title: "1.1 人口学信息",
      fields: [
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
      ],
    },
    {
      id: "sec_1_2",
      title: "1.2 通讯及联系方式",
      fields: ["provi", "city", "district", "road", "phone1", "phone2", "wechat"],
    },
  ],
};
