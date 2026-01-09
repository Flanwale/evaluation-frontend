export interface Patient {
  id: string;
  subject_label: string;
  protocol_id: string;
  created_at: string;
}

export interface CrfMeta {
  code: string;
  name: string;
  parent_code: string;
  ordinal: number;
}

export interface EventMeta {
  event_code: string;
  event_name: string;
  crfs: CrfMeta[];
}

export interface CrfFieldData {
  key: string;
  label: string;
  value: string | number | null;
}