/** Catatan satu berkas APK yang diunggah Super Admin. */
export interface AppRelease {
  id: string;
  version_name: string;
  version_code: number;
  file_name: string;
  /** Ukuran berkas dalam byte. `bigint` di Postgres, dibaca sebagai teks. */
  file_size: string | number;
  checksum_sha256: string;
  release_notes: string | null;
  is_active: boolean;
  uploaded_by: string;
  created_at: string;
}

/** Baris rilis beserta nama pengunggahnya, untuk tabel di halaman admin. */
export interface AppReleaseRow extends AppRelease {
  uploader_name: string | null;
}

export interface CreateAppReleaseInput {
  version_name: string;
  version_code: number;
  file_name: string;
  file_size: number;
  checksum_sha256: string;
  release_notes: string | null;
  uploaded_by: string;
}
