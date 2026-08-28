import { Button } from "@effect-forge/ui/ui/button";
import { useState } from "react";

export const InstallCommand = ({ command }: { readonly command: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="max-w-lg w-full flex items-center gap-2 rounded-md border bg-muted/25 py-1 pr-1 pl-3 font-mono text-sm">
      <span className="select-none text-muted-foreground">$</span>
      <code className="truncate">{command}</code>
      <Button
        aria-label="Copy install command"
        className="ml-auto font-mono text-xs active:scale-[0.97]"
        onClick={copy}
        size="sm"
        variant="ghost"
      >
        {copied ? "copied" : "copy"}
      </Button>
    </div>
  );
};
