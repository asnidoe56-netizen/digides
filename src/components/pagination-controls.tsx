import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationControlsProps {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

// Plain <Link>s (not client-side state) so paging still works with
// JavaScript disabled or mid-load, and the current page survives a
// refresh/share via the URL — matches the "URL state for pagination"
// strategy from the M03 planning doc. Shared across every list page
// (Products, Users, ...) rather than reimplemented per feature.
export function PaginationControls({ page, totalPages, buildHref }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const disabledClasses = "pointer-events-none opacity-40";

  return (
    <div className="print:hidden flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
          Sebelumnya
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline" }), "h-11", disabledClasses)}>Sebelumnya</span>
      )}

      <p className="text-sm text-muted-foreground">
        Halaman {page} dari {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
          Berikutnya
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline" }), "h-11", disabledClasses)}>Berikutnya</span>
      )}
    </div>
  );
}
