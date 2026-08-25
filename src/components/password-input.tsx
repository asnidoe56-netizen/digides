"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// A password/PIN field with a show/hide toggle — every other input in the
// app is a plain <Input type="password">, this is the one place a form
// needs the eye icon (issue: Mitra registration's password/PIN fields).
export function PasswordInput({ className, ...props }: React.ComponentPropsWithRef<"input">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        tabIndex={-1}
        aria-label={visible ? "Sembunyikan" : "Tampilkan"}
        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
