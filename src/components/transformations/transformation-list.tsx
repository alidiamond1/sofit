"use client";

/* eslint-disable @next/next/no-img-element */
import { Eye, EyeOff, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  createDraftTransformationAction,
  togglePublishTransformationAction,
  type TransformationActionState,
} from "@/app/actions/transformations";
import { Badge, Card } from "@/components/dashboard/primitives";

export type TransformationListRow = {
  id: number;
  displayName: string;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  description: string;
  isPublished: boolean;
};

const initialState: TransformationActionState = {};

function RowThumb({ item, label }: { item: TransformationListRow; label: string }) {
  if (!item.beforePhotoUrl && !item.afterPhotoUrl) {
    return <span className="transformation-row-empty-thumb"><Sparkles size={16} /></span>;
  }
  return (
    <div className="transformation-photos transformation-row-thumb">
      <div className="transformation-photo">{item.beforePhotoUrl ? <img src={item.beforePhotoUrl} alt={`${label} — before`} loading="lazy" /> : null}</div>
      <div className="transformation-photo">{item.afterPhotoUrl ? <img src={item.afterPhotoUrl} alt={`${label} — after`} loading="lazy" /> : null}</div>
    </div>
  );
}

function TransformationRow({ item }: { item: TransformationListRow }) {
  const t = useTranslations("Transformations.list");
  const router = useRouter();
  const [state, toggleAction, pending] = useActionState(async (previous: TransformationActionState, formData: FormData) => togglePublishTransformationAction(previous, formData), initialState);

  function open() {
    router.push(`/coach/transformations?transformation=${item.id}`);
  }

  return (
    <div
      className="transformation-row"
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } }}
      aria-label={t("openAria", { name: item.displayName })}
    >
      <RowThumb item={item} label={item.displayName} />
      <div className="transformation-row-info">
        <strong>{item.displayName}</strong>
        <span>{item.description || t("noDescription")}</span>
      </div>
      <div className="transformation-row-status" onClick={(event) => event.stopPropagation()}>
        <Badge tone={item.isPublished ? "success" : "neutral"}>{item.isPublished ? t("published") : t("hidden")}</Badge>
        <form action={toggleAction}>
          <input type="hidden" name="id" value={item.id} />
          <button className="button secondary small" type="submit" disabled={pending} aria-label={item.isPublished ? t("hideAria", { name: item.displayName }) : t("publishAria", { name: item.displayName })}>
            {item.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </form>
        {state.error ? <p className="transformation-row-error" role="alert">{state.error}</p> : null}
      </div>
    </div>
  );
}

export function TransformationList({ transformations }: { transformations: TransformationListRow[] }) {
  const t = useTranslations("Transformations.list");

  return (
    <>
      <div className="service-library-toolbar">
        <div><span className="workspace-icon"><Sparkles size={19} /></span><div><strong>{t("toolbarTitle")}</strong><span>{t("toolbarSubtitle", { count: transformations.length })}</span></div></div>
        <form action={createDraftTransformationAction}>
          <button className="button primary" type="submit"><Plus size={16} /> {t("createTransformation")}</button>
        </form>
      </div>

      {transformations.length === 0 ? (
        <Card className="empty-state"><Sparkles size={24} /><h3>{t("noTransformationsTitle")}</h3><p>{t("noTransformationsHint")}</p></Card>
      ) : (
        <div className="transformation-list">
          {transformations.map((item) => <TransformationRow key={item.id} item={item} />)}
        </div>
      )}
    </>
  );
}
