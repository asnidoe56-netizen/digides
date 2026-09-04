export interface SupportSettings {
  id: string;
  /** International format, no leading 0 or + (e.g. "6281377444419") — see
   *  032_support_settings.sql and supportSettingsSchema's normalization. */
  whatsapp_number: string;
  updated_at: Date;
  updated_by: string | null;
}
