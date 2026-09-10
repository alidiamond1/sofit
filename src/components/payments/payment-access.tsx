"use client";

import { LockKeyhole, ArrowUpRight, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, type ReactNode, type MouseEvent } from "react";
import { isOpenClientPath } from "@/lib/payments/rules";

export function PaymentAccessBoundary({ locked, children }: { locked: boolean; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const t = useTranslations("Billing");
  useEffect(() => {
    if (locked && !isOpenClientPath(pathname)) dialog.current?.showModal();
    else dialog.current?.close();
  }, [locked, pathname]);

  function intercept(event: MouseEvent<HTMLDivElement>) {
    if (!locked || !(event.target instanceof Element)) return;
    const link = event.target.closest("a[href]");
    if (!link) return;
    const url = new URL(link.getAttribute("href")!, window.location.origin);
    if (url.origin === window.location.origin && url.pathname.startsWith("/client/") && !isOpenClientPath(url.pathname)) {
      event.preventDefault();
      event.stopPropagation();
      dialog.current?.showModal();
    }
  }

  return <div className="payment-access-boundary" onClickCapture={intercept}>
    {children}
    <dialog ref={dialog} className="payment-lock-dialog" aria-labelledby="payment-lock-title" aria-describedby="payment-lock-description">
      <button className="icon-button payment-dialog-close" onClick={() => dialog.current?.close()} aria-label={t("close")}><X size={20} /></button>
      <span className="billing-icon"><LockKeyhole size={26} /></span>
      <span className="eyebrow">{t("lockedLabel")}</span>
      <h2 id="payment-lock-title">{t("lockTitle")}</h2>
      <p id="payment-lock-description">{t("lockDescription")}</p>
      <Link href="/client/payments" className="button primary full" onClick={() => dialog.current?.close()}>{t("viewPayment")}<ArrowUpRight size={17} /></Link>
      <button className="text-button" onClick={() => dialog.current?.close()}>{t("later")}</button>
    </dialog>
  </div>;
}
