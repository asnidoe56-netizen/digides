import Image from "next/image";

/**
 * Lambang elang Digides.
 *
 * Berkas logonya persegi dan memuat DUA hal: lambangnya di atas, dan tulisan
 * "DIGIDES PAY" di bawahnya. Dipasang utuh setinggi 36 piksel, tulisan itu
 * mengecil menjadi noda yang tidak terbaca. Jadi yang ditampilkan di sini
 * hanya bagian lambangnya — dipotong lewat jendela, bukan dengan menyunting
 * berkasnya, supaya tetap satu berkas yang sama dengan yang dipakai layar
 * pembuka aplikasi. Tulisan mereknya ditulis sebagai teks di sebelahnya,
 * sehingga tetap terbaca dan tetap bisa dipilih serta dibaca mesin pencari.
 *
 * Latar berkasnya hitam pekat, dan itu sebabnya ia hanya dipakai di bagian
 * pembuka dan kaki halaman yang juga hitam.
 */
export function LogoDigides({ size = 40, priority = false }: { size?: number; priority?: boolean }) {
  const perbesar = Math.round(size * 1.43);

  return (
    <span
      aria-hidden
      className="block shrink-0 overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src="/logos/digidespay.jpg"
        alt=""
        width={perbesar}
        height={perbesar}
        priority={priority}
        className="max-w-none"
        style={{
          marginLeft: -Math.round(perbesar * 0.15),
          marginTop: -Math.round(perbesar * 0.05),
        }}
      />
    </span>
  );
}

/** Lambang beserta nama mereknya, seperti yang dipakai di kepala halaman. */
export function LogoDenganNama({
  size = 40,
  priority = false,
}: {
  size?: number;
  priority?: boolean;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoDigides size={size} priority={priority} />
      <span className="text-lg font-extrabold tracking-tight text-white">
        DIGIDES<span className="text-red-500">PAY</span>
      </span>
    </span>
  );
}
