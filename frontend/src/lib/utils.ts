import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, with later Tailwind utilities winning over earlier ones
 * in the same group.
 *
 * Plain string concatenation cannot do this: `"p-4" + " p-6"` leaves both in
 * the class list and the winner is decided by stylesheet order, not by the
 * caller. That is exactly the trap a variant component falls into when a
 * consumer passes `className` to override a default.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
