import { Trophy } from "lucide-react";

// Static for now — no loyalty/points system exists yet in the backend.
// This is purely the visual banner from the reference design; wiring a
// real points balance is a separate future feature, not fabricated here.
export function PromoBanner() {
  return (
    <div className="flex items-center justify-between gap-4 overflow-hidden rounded-2xl bg-linear-to-r from-red-600 to-red-500 p-4 text-white">
      <div>
        <p className="font-semibold">Dapatkan Poin!</p>
        <p className="text-sm text-white/85">Raih lebih banyak hadiah</p>
        <button
          type="button"
          disabled
          title="Segera hadir"
          className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-red-600"
        >
          Cek Poin
        </button>
      </div>
      <Trophy className="size-14 shrink-0 text-yellow-300" />
    </div>
  );
}
