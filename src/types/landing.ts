/** Gambar yang diunggah admin untuk halaman depan. */
export interface LandingMedia {
  id: string;
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: string | number;
  width: number | null;
  height: number | null;
  alt_text: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface CreateLandingMediaInput {
  file_name: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  width: number;
  height: number;
  alt_text: string;
  uploaded_by: string;
}

/**
 * Jenis bagian menentukan komponen mana yang menggambarnya. Ini satu-satunya
 * hal di seluruh isi halaman depan yang memang milik kode dan tidak bisa
 * diubah dari halaman admin.
 */
export type LandingSectionKind =
  | "situs"
  | "navigasi"
  | "hero"
  | "narasi"
  | "kartu"
  | "pergeseran"
  | "solusi"
  | "kalkulator"
  | "langkah"
  | "profil"
  | "penutup"
  | "faq"
  | "kaki";

export interface LandingSection {
  id: string;
  key: string;
  kind: LandingSectionKind;
  eyebrow: string | null;
  title: string | null;
  title_accent: string | null;
  body: string | null;
  body_secondary: string | null;
  quote: string | null;
  script_text: string | null;
  media_id: string | null;
  settings: Record<string, unknown>;
  is_visible: boolean;
  sort_order: number;
  updated_by: string | null;
  updated_at: string;
}

export interface LandingItem {
  id: string;
  section_id: string;
  group_key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  icon: string | null;
  media_id: string | null;
  link_label: string | null;
  link_url: string | null;
  data: Record<string, unknown>;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Satu bagian beserta gambar dan butir-butirnya, siap digambar. */
export interface LandingSectionFull extends LandingSection {
  media: LandingMedia | null;
  items: (LandingItem & { media: LandingMedia | null })[];
}

export type LandingItemFull = LandingSectionFull["items"][number];

/** Seluruh isi halaman depan dalam satu bentuk, dikunci berdasarkan `key`. */
export interface LandingPage {
  sections: LandingSectionFull[];
  byKey: Record<string, LandingSectionFull | undefined>;
}

/** Kolom yang boleh diubah admin. `key` dan `kind` sengaja tidak termasuk. */
export interface UpdateLandingSectionInput {
  eyebrow?: string | null;
  title?: string | null;
  title_accent?: string | null;
  body?: string | null;
  body_secondary?: string | null;
  quote?: string | null;
  script_text?: string | null;
  media_id?: string | null;
  settings?: Record<string, unknown>;
  is_visible?: boolean;
  sort_order?: number;
}

export interface UpsertLandingItemInput {
  section_id: string;
  group_key?: string;
  title?: string | null;
  subtitle?: string | null;
  body?: string | null;
  icon?: string | null;
  media_id?: string | null;
  link_label?: string | null;
  link_url?: string | null;
  data?: Record<string, unknown>;
  is_visible?: boolean;
  sort_order?: number;
}
