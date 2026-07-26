"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Loader2, Link2, Trash2, Dumbbell, Play, Utensils } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

/* ------------------------------------------------------------------
   Exercise media: real photos / GIFs / video (hosted on ImageKit),
   with a premium glass fallback when no media is attached yet.
------------------------------------------------------------------ */

export type MediaVariant = "tile" | "thumb" | "hero";

/** Decide how to render a media URL. Cloudinary video URLs live under
 *  /video/upload/ and end in a video extension; everything else is an image/gif. */
export function mediaKind(url?: string | null): "image" | "video" | "none" {
  if (!url) return "none";
  const value = url.toLowerCase();
  if (value.includes("/video/upload/") || /\.(mp4|webm|mov|m4v|ogv)(\?|$)/.test(value)) return "video";
  return "image";
}

/** A still poster frame for a video URL, per host. */
function videoPoster(url: string): string | undefined {
  if (url.includes("ik.imagekit.io")) return `${url}/ik-thumbnail.jpg`; // ImageKit
  if (url.includes("/video/upload/")) return url.replace(/\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i, ".jpg"); // Cloudinary
  return undefined;
}

function VideoMedia({
  url,
  name,
  autoplay,
  onError,
}: {
  url: string;
  name: string;
  autoplay: boolean;
  onError: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  // Only the single hero preview autoplays. In galleries/lists we show a poster
  // frame and play on hover, so dozens of clips never download + loop at once.
  return (
    <video
      ref={ref}
      src={url}
      poster={videoPoster(url)}
      muted
      loop
      playsInline
      autoPlay={autoplay}
      preload={autoplay ? "auto" : "none"}
      aria-label={`${name} demonstration`}
      onError={onError}
      onMouseEnter={autoplay ? undefined : () => { void ref.current?.play().catch(() => {}); }}
      onMouseLeave={autoplay ? undefined : () => { ref.current?.pause(); }}
    />
  );
}

export function ExerciseMedia({
  url,
  name,
  muscleGroup,
  variant = "tile",
  className = "",
  context = "exercise",
}: {
  url?: string | null;
  name: string;
  muscleGroup?: string | null;
  variant?: MediaVariant;
  className?: string;
  context?: "exercise" | "meal";
}) {
  const [failed, setFailed] = useState(false);
  // Reset the failure flag when the media source changes (React's "adjust state
  // during render" pattern — cheaper and safer than a setState-in-effect).
  const [lastUrl, setLastUrl] = useState(url);
  if (url !== lastUrl) {
    setLastUrl(url);
    setFailed(false);
  }

  const kind = failed ? "none" : mediaKind(url);
  const root = `exercise-media as-${variant} ${className}`.trim();

  if (kind === "video") {
    return (
      <div className={`${root} has-media is-video`}>
        <VideoMedia url={url as string} name={name} autoplay={variant === "hero"} onError={() => setFailed(true)} />
        <span className="media-play-badge" aria-hidden="true"><Play size={12} /></span>
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className={`${root} has-media is-image`}>
        <img
          src={url as string}
          alt={`${name} demonstration`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${root} is-empty`} role="img" aria-label={`${name} — no media yet`}>
      <span className="media-empty-icon">{context === "meal" ? <Utensils size={variant === "thumb" ? 16 : 22} /> : <Dumbbell size={variant === "thumb" ? 16 : 22} />}</span>
      {variant !== "thumb" ? <span className="media-empty-label">{muscleGroup || (context === "meal" ? "Add a photo" : "Add a demo")}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------
   ImageKit uploader. Client-side upload signed by our own /api/imagekit-auth
   endpoint (which holds the private key). Writes the resulting URL into a
   hidden input so the existing server action (reads `media_url`) just works.
------------------------------------------------------------------ */

const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_READY = Boolean(IMAGEKIT_PUBLIC_KEY);
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export function MediaUploader({
  inputName = "media_url",
  defaultUrl = "",
  name = "New exercise",
  muscleGroup,
  context = "exercise",
}: {
  inputName?: string;
  defaultUrl?: string | null;
  name?: string;
  muscleGroup?: string | null;
  context?: "exercise" | "meal";
}) {
  const [url, setUrl] = useState<string>(defaultUrl || "");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadToImageKit(file: File) {
    if (file.size > MAX_BYTES) {
      setStatus("error");
      setMessage("File is larger than 25 MB. Compress it or use a shorter clip.");
      return;
    }
    setStatus("uploading");
    setMessage("");
    try {
      const authResponse = await fetch("/api/imagekit-auth");
      if (!authResponse.ok) throw new Error(`Auth ${authResponse.status}`);
      const auth = (await authResponse.json()) as { token: string; expire: string; signature: string };

      const body = new FormData();
      body.append("file", file);
      body.append("fileName", file.name || `sofit-${auth.token}`);
      body.append("publicKey", IMAGEKIT_PUBLIC_KEY as string);
      body.append("signature", auth.signature);
      body.append("expire", auth.expire);
      body.append("token", auth.token);
      body.append("folder", "/sofit");

      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body });
      if (!response.ok) throw new Error(`ImageKit responded ${response.status}`);
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("No URL returned from ImageKit.");
      setUrl(data.url);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Upload failed. Check your ImageKit keys, or paste a direct media URL below.");
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadToImageKit(file);
    event.target.value = "";
  }

  return (
    <div className="media-uploader">
      <input type="hidden" name={inputName} value={url} />

      <div className={`media-dropzone${url ? " has-preview" : ""}`}>
        {url ? (
          <ExerciseMedia url={url} name={name} muscleGroup={muscleGroup} variant="hero" context={context} />
        ) : (
          <div className="media-dropzone-empty">
            <span className="media-empty-icon"><ImagePlus size={22} /></span>
            <strong>{context === "meal" ? "Add a food photo" : "Add a photo, GIF, or video"}</strong>
            <span>{context === "meal" ? "Show the client exactly what the meal looks like." : "Show the movement so your client trains with perfect form."}</span>
          </div>
        )}

        {status === "uploading" ? (
          <div className="media-uploading" role="status">
            <Loader2 size={18} className="spin" /> Uploading…
          </div>
        ) : null}
      </div>

      <div className="media-uploader-actions">
        {IMAGEKIT_READY ? (
          <button type="button" className="button secondary small" onClick={() => fileRef.current?.click()} disabled={status === "uploading"}>
            <ImagePlus size={14} /> {url ? "Replace media" : "Upload media"}
          </button>
        ) : null}
        {url ? (
          <button type="button" className="button secondary small danger-text" onClick={() => { setUrl(""); setStatus("idle"); setMessage(""); }}>
            <Trash2 size={14} /> Remove
          </button>
        ) : null}
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={onPick} />

      <label className="media-url-field">
        <span><Link2 size={12} /> Or paste a direct image / GIF / video URL</span>
        <input
          type="text"
          inputMode="url"
          value={url}
          placeholder="https://ik.imagekit.io/…/squat.mp4"
          onChange={(event) => { setUrl(event.target.value); setStatus("idle"); setMessage(""); }}
        />
      </label>

      {!IMAGEKIT_READY ? (
        <p className="media-hint">
          Tip: set <code>NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY</code> and <code>IMAGEKIT_PRIVATE_KEY</code> to enable one-click uploads.
        </p>
      ) : null}
      {status === "error" ? <p className="media-hint error">{message}</p> : null}
    </div>
  );
}
