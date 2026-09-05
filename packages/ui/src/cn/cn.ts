import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Compose conditional class names, resolving conflicting Tailwind utilities. */
export const cn = (...inputs: ReadonlyArray<ClassValue>) => twMerge(clsx(inputs));

/** Svelte component props extended with the `bind:this` element reference shadcn-svelte exposes. */
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };

/** Drop the `children` snippet from props for components that render no slot. */
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, "children"> : T;
