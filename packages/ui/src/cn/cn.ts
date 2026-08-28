import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Compose conditional class names, resolving conflicting Tailwind utilities. */
export const cn = (...inputs: ReadonlyArray<ClassValue>) => twMerge(clsx(inputs));
