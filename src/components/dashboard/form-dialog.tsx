"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

export function FormDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const t = useTranslations("Common");
  useEffect(() => {
    const dialog = ref.current!;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);
  return <dialog ref={ref} className="health-form-dialog" aria-labelledby={id} onClose={onClose}>
    <header><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label={t("close")} onClick={onClose}><X size={20} /></button></header>
    {children}
  </dialog>;
}
