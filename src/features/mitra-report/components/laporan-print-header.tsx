export interface LaporanPrintHeaderProps {
  fullName: string;
  tabLabel: string;
  periodLabel: string;
}

// Only visible when printing/exporting to PDF (hidden on screen) — replaces
// the interactive tabs/period picker/export button that print:hidden
// removes, so the exported PDF still says what report this is and for
// which period.
export function LaporanPrintHeader({ fullName, tabLabel, periodLabel }: LaporanPrintHeaderProps) {
  return (
    <div className="hidden print:block">
      <h1 className="text-lg font-bold">Laporan {tabLabel}</h1>
      <p className="text-sm text-muted-foreground">{fullName}</p>
      <p className="text-sm text-muted-foreground">Periode: {periodLabel}</p>
      <hr className="my-3" />
    </div>
  );
}
