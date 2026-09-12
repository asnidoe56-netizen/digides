/**
 * Tombol WhatsApp mengambang.
 *
 * Sengaja hanya sebuah tautan, bukan komponen yang menjalankan JavaScript:
 * halaman ini sering dibuka dari peramban di dalam aplikasi WhatsApp itu
 * sendiri, tempat JavaScript kadang dibatasi. Tautan biasa selalu bekerja.
 *
 * Warnanya hijau, satu-satunya hijau di seluruh halaman. Merah adalah warna
 * tindakan utama di sini (daftar, beli), dan tombol ini bukan itu — ia jalan
 * keluar untuk orang yang masih ragu. Hijau WhatsApp juga langsung dikenali,
 * sehingga tidak perlu dijelaskan bahwa yang terbuka nanti adalah WhatsApp.
 */
export function TombolWhatsapp({
  nomor,
  label,
  pesan,
}: {
  nomor: string;
  label: string;
  pesan: string;
}) {
  // Nomor disimpan apa adanya oleh admin; di sini dibersihkan menjadi bentuk
  // yang diterima wa.me — hanya angka, dan 0 di depan diganti 62.
  const bersih = nomor.replace(/[^0-9]/g, "").replace(/^0/, "62");

  // Tanpa nomor, tidak ada tombol. Lebih baik tidak ada daripada ada tapi
  // menuju ke mana-mana.
  if (bersih.length < 8) return null;

  const alamat = `https://wa.me/${bersih}${pesan ? `?text=${encodeURIComponent(pesan)}` : ""}`;

  return (
    <a
      className="wa"
      href={alamat}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} lewat WhatsApp`}
    >
      <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden>
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.34-1.4a9.82 9.82 0 0 0 4.7 1.2h.01c5.43 0 9.85-4.42 9.85-9.86C21.9 6.42 17.48 2 12.04 2zm0 17.94h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.15 8.15 0 0 1-1.25-4.36c0-4.52 3.68-8.19 8.2-8.19 2.19 0 4.25.85 5.8 2.4a8.15 8.15 0 0 1 2.4 5.8c0 4.52-3.68 8.19-8.2 8.19z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
