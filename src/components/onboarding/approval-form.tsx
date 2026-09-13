"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { approveApplicationAction } from "@/app/actions/onboarding";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function ApprovalForm({ inviteId, currentPackageId, accountReady, alreadyApproved, packages }: {
  inviteId: number;
  currentPackageId: number | null;
  accountReady: boolean;
  alreadyApproved: boolean;
  packages: { id: number; name: string; price: number; billingInterval: string }[];
}) {
  const t = useTranslations("Invites");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(approveApplicationAction, {});
  const disabled = !accountReady || pending || packages.length === 0;

  return (
    <form action={formAction}>
      <input type="hidden" name="invite_id" value={inviteId} />
      <label>
        <span>{t("packageLabel")}</span>
        <select name="package_id" defaultValue={packages.some((pkg) => pkg.id === currentPackageId) ? String(currentPackageId) : ""} required disabled={disabled}>
          <option value="" disabled>{t("choosePackage")}</option>
          {packages.map((pkg) => <option key={pkg.id} value={pkg.id}>{pkg.name} - {money.format(pkg.price)} · {tc(`billing.${pkg.billingInterval === "one_time" ? "oneTime" : pkg.billingInterval}`)}</option>)}
        </select>
      </label>
      {packages.length === 0 && <p>{t("noPackagesAvailable")}</p>}
      <button className="button primary full" disabled={disabled}><Check size={15} /> {!accountReady ? t("waitingForSignup") : pending ? tc("saving") : alreadyApproved ? t("updatePackage") : t("approveAndOpenPortal")}</button>
      {state.error && <p className="form-message error" role="alert">{state.error}</p>}
      {state.success && <p className="form-message success" role="status">{t("packageAssigned")}</p>}
    </form>
  );
}
