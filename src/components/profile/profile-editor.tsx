"use client";

import { Camera, CheckCircle2, Save, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { updateProfileAction, uploadAvatarAction } from "@/app/actions/profile";
import { Avatar } from "@/components/dashboard/primitives";

type ProfileEditorProps = {
  role: "coach" | "client";
  profile: {
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    location: string;
    bio: string;
    avatarPath: string | null;
  };
};

export function ProfileEditor({ role, profile }: ProfileEditorProps) {
  const t = useTranslations("Account");
  const tc = useTranslations("Common");
  const updateAction = updateProfileAction.bind(null, role);
  const avatarAction = uploadAvatarAction.bind(null, role);
  const [profileState, profileFormAction, profilePending] = useActionState(updateAction, {});
  const [avatarState, avatarFormAction, avatarPending] = useActionState(avatarAction, {});
  const [preview, setPreview] = useState(profile.avatarPath || "");
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    setSelectedName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <section className="profile-editor-panel" id="profile-information" aria-labelledby="profile-details-title">
      <div className="account-card-heading profile-editor-heading">
        <div><span className="eyebrow">{t("personalDetailsEyebrow")}</span><h2 id="profile-details-title">{t("profileInformationTitle")}</h2><p>{t("profileInformationHint")}</p></div>
      </div>
      <div className="profile-photo-section" aria-labelledby="profile-photo-title">
        <div className="account-card-heading">
          <div><span className="eyebrow">{t("profileImageEyebrow")}</span><h2 id="profile-photo-title">{t("yourPhotoTitle")}</h2><p>{t("yourPhotoHint")}</p></div>
          <span className="account-heading-icon"><Camera size={18} /></span>
        </div>
        <form action={avatarFormAction} className="profile-photo-form">
          <Avatar name={profile.name} src={preview || null} className="profile-avatar-large" />
          <div className="profile-photo-actions">
            <strong>{selectedName || t("choosePhotoDefault")}</strong>
            <span>{t("photoRequirements")}</span>
            <div>
              <label className="button secondary profile-file-button">
                <Upload size={15} /> {t("choosePhotoButton")}
                <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])} required />
              </label>
              <button className="button primary" disabled={avatarPending} type="submit">{avatarPending ? t("uploadingPhoto") : t("savePhoto")}</button>
            </div>
          </div>
        </form>
        <FormMessage error={avatarState.error} success={avatarState.success} />
      </div>
      <div className="profile-details-section">
        <div className="profile-details-intro"><strong>{t("personalInformationHeading")}</strong><span>{t("personalInformationHint")}</span></div>
        <form action={profileFormAction} className="account-form-grid">
          <label><span>{t("fullName")}</span><input name="name" defaultValue={profile.name} autoComplete="name" required /></label>
          <label><span>{t("emailAddress")}</span><input value={profile.email} readOnly aria-readonly="true" /></label>
          <label><span>{t("phoneNumber")}</span><input name="phone" defaultValue={profile.phone} type="tel" autoComplete="tel" placeholder={t("phonePlaceholder")} /></label>
          <label><span>{t("dateOfBirth")}</span><input name="date_of_birth" defaultValue={profile.dateOfBirth} type="date" /></label>
          <label className="full"><span>{t("locationLabel")}</span><input name="location" defaultValue={profile.location} autoComplete="address-level2" placeholder={t("locationPlaceholder")} /></label>
          <label className="full"><span>{t("shortBio")}</span><textarea name="bio" defaultValue={profile.bio} rows={4} placeholder={role === "coach" ? t("bioPlaceholderCoach") : t("bioPlaceholderClient")} /></label>
          <div className="account-form-footer full">
            <FormMessage error={profileState.error} success={profileState.success} />
            <button className="button primary" disabled={profilePending} type="submit"><Save size={15} /> {profilePending ? tc("saving") : t("saveProfile")}</button>
          </div>
        </form>
      </div>
    </section>
  );
}

function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p className={`account-form-message ${error ? "error" : "success"}`} aria-live="polite">{success ? <CheckCircle2 size={15} /> : null}{error || success}</p>;
}
