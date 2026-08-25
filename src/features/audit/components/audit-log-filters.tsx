"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterSheet } from "@/components/feedback/filter-sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTER_KEYS = ["entity", "dateFrom", "dateTo"] as const;

export interface AuditLogFiltersProps {
  entities: string[];
}

export function AuditLogFilters({ entities }: AuditLogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [actorSearch, setActorSearch] = useState(searchParams.get("actor") ?? "");
  const [open, setOpen] = useState(false);

  const applied = Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""]));
  const [pending, setPending] = useState(applied);

  const activeFilterCount = FILTER_KEYS.filter((key) => applied[key]).length;

  function updateParams(values: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value && value !== "ALL") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleActorSearchSubmit(event: FormEvent) {
    event.preventDefault();
    updateParams({ actor: actorSearch });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <form onSubmit={handleActorSearchSubmit} className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={actorSearch}
            onChange={(event) => setActorSearch(event.target.value)}
            placeholder="Cari nama atau email pelaku..."
            className="h-11 pl-9"
          />
        </form>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPending(applied);
            setOpen(true);
          }}
          aria-label="Filter"
          className="h-11 shrink-0 gap-2 px-3"
        >
          <Filter className="size-4" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 ? (
            <Badge className="h-5 min-w-5 justify-center rounded-full px-1 text-xs">{activeFilterCount}</Badge>
          ) : null}
        </Button>
      </div>

      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        title="Filter Audit Log"
        onReset={() => {
          const cleared = Object.fromEntries(FILTER_KEYS.map((key) => [key, ""]));
          setPending(cleared);
          updateParams(cleared);
          setOpen(false);
        }}
        onApply={() => {
          updateParams(pending);
          setOpen(false);
        }}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-0">
          <div className="grid gap-2">
            <Label htmlFor="audit-entity">Entitas</Label>
            <Select
              value={pending.entity || "ALL"}
              onValueChange={(value) => setPending((prev) => ({ ...prev, entity: value }))}
            >
              <SelectTrigger id="audit-entity" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Entitas</SelectItem>
                {entities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="audit-date-from">Dari Tanggal</Label>
              <Input
                id="audit-date-from"
                type="date"
                className="h-11"
                value={pending.dateFrom}
                onChange={(event) => setPending((prev) => ({ ...prev, dateFrom: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="audit-date-to">Sampai Tanggal</Label>
              <Input
                id="audit-date-to"
                type="date"
                className="h-11"
                value={pending.dateTo}
                onChange={(event) => setPending((prev) => ({ ...prev, dateTo: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </FilterSheet>
    </div>
  );
}
