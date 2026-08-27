"use client";

import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Uses the browser's own print-to-PDF (window.print, destination "Save as
// PDF") rather than a new client-side PDF library — every element that
// shouldn't appear in the export (bottom nav, tabs, period picker, this
// button itself, pagination) is already marked print:hidden, so what
// prints is just the report content.
export function ExportPdfButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      className="print:hidden h-10 gap-2 border-red-600 text-red-600 hover:bg-red-50"
    >
      <FileDown className="size-4" />
      Export PDF
    </Button>
  );
}
