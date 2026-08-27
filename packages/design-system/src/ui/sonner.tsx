import type { CSSProperties, ComponentProps } from "react";
import { Toaster as Sonner, toast } from "sonner";

function Toaster({ ...props }: ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster, toast };
