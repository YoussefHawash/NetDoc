import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Base UI's Select doesn't infer item labels from rendered <SelectItem>
 * children like Radix did — without this, SelectValue falls back to
 * printing the raw value (an id, or an unlabeled enum key).
 */
export function selectItems(
  entries: { value: string; label: string }[],
): Record<string, string> {
  return Object.fromEntries(entries.map((e) => [e.value, e.label]))
}
