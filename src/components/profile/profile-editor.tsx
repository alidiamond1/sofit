"use client";

import { Camera, CheckCircle2, Save, Upload } from "lucide-react";
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
    goals: string;
    medicalNotes: string;
    avatarPath: string | null;
  };
};

export function ProfileEditor({ role, profile }: ProfileEditorProps) {
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
        <div><span className="eyebrow">Personal details</span><h2 id="profile-details-title">Profile information</h2><p>Keep your contact details and profile image current in one place.</p></div>
      </div>
      <div className="profile-photo-section" aria-labelledby="profile-photo-title">
        <div className="account-card-heading">
          <div><span className="eyebrow">Profile image</span><h2 id="profile-photo-title">Your photo</h2><p>Shown in the sidebar, top bar, and your account profile.</p></div>
          <span className="account-heading-icon"><Camera size={18} /></span>
        </div>
        <form action={avatarFormAction} className="profile-photo-form">
          <Avatar name={profile.name} src={preview || null} className="profile-avatar-large" />
          <div className="profile-photo-actions">
            <strong>{selectedName || "Choose a clear square photo"}</strong>
            <span>JPG, PNG or WebP. Maximum size 2 MB.</span>
            <div>
              <label className="button secondary profile-file-button">
                <Upload size={15} /> Choose photo
                <input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])} required />
              </label>
              <button className="button primary" disabled={avatarPending} type="submit">{avatarPending ? "Uploading..." : "Save photo"}</button>
            </div>
          </div>
        </form>
        <FormMessage error={avatarState.error} success={avatarState.success} />
      </div>
      <div className="profile-details-section">
        <div className="profile-details-intro"><strong>Personal information</strong><span>Invite answers remain unchanged; these fields complete your account details.</span></div>
        <form action={profileFormAction} className="account-form-grid">
          <label><span>Full name</span><input name="name" defaultValue={profile.name} autoComplete="name" required /></label>
          <label><span>Email address</span><input value={profile.email} readOnly aria-readonly="true" /></label>
          <label><span>Phone number</span><input name="phone" defaultValue={profile.phone} type="tel" autoComplete="tel" placeholder="Add your phone number" /></label>
          <label><span>Date of birth</span><input name="date_of_birth" defaultValue={profile.dateOfBirth} type="date" /></label>
          <label className="full"><span>Location</span><input name="location" defaultValue={profile.location} autoComplete="address-level2" placeholder="City, country" /></label>
          <label className="full"><span>Short bio</span><textarea name="bio" defaultValue={profile.bio} rows={4} placeholder={role === "coach" ? "Tell clients about your coaching approach." : "Share anything useful about your lifestyle or routine."} /></label>
          {role === "client" ? (
            <>
              <label className="full"><span>Current goals</span><textarea name="goals" defaultValue={profile.goals} rows={4} /></label>
              <label className="full"><span>Medical notes</span><textarea name="medical_notes" defaultValue={profile.medicalNotes} rows={3} placeholder="Add anything your coach should know." /></label>
            </>
          ) : null}
          <div className="account-form-footer full">
            <FormMessage error={profileState.error} success={profileState.success} />
            <button className="button primary" disabled={profilePending} type="submit"><Save size={15} /> {profilePending ? "Saving..." : "Save profile"}</button>
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
