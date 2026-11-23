"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/** App toaster. Colours come from tokens via CSS variables, no raw hex. */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-input !border-line !bg-surface !text-text !shadow-card",
          description: "!text-muted",
        },
      }}
      {...props}
    />
  );
}
