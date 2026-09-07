-- Registration address (Provinsi/Kabupaten-Kota/Kecamatan/Kelurahan-Desa,
-- each a foreign key into the wilayah reference table added in migration
-- 039) plus an optional GPS coordinate captured once at registration time.
-- All six columns are nullable — address collection is optional at sign-up
-- (never blocks account creation) and can be filled in later from the
-- profile screen; the coordinate is stored as-is (no reverse-geocoding),
-- purely as a "where did this mitra register from" reference point.
ALTER TABLE users
  ADD COLUMN province_code varchar(13) REFERENCES wilayah(kode) ON DELETE SET NULL,
  ADD COLUMN regency_code varchar(13) REFERENCES wilayah(kode) ON DELETE SET NULL,
  ADD COLUMN district_code varchar(13) REFERENCES wilayah(kode) ON DELETE SET NULL,
  ADD COLUMN village_code varchar(13) REFERENCES wilayah(kode) ON DELETE SET NULL,
  ADD COLUMN registration_latitude double precision,
  ADD COLUMN registration_longitude double precision;
