import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldClass =
  "min-h-11 w-full rounded-lg border border-border bg-elevated px-3.5 py-3 text-sm text-fg outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted/70 focus:border-primary";

export function Field(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldClass, "min-h-24 resize-none", props.className)} />;
}
