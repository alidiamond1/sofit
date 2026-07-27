"use client";

import { useEffect, useState } from "react";

/* Deliberately self-contained: no Tailwind, no design-system classes, no icon
   package. This screen has to render correctly in exactly the situations where
   the rest of the app failed, which sometimes includes its stylesheet. */

const STYLES = `
.sofit-fallback{--bg:#f6f8fb;--card:#fff;--ink:#0f1a2a;--muted:#5b6b80;--line:#e3e9f1;--accent:#1f75b9;
  min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg);color:var(--ink);
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
@media (prefers-color-scheme:dark){.sofit-fallback{--bg:#080c14;--card:#111826;--ink:#eef3fa;--muted:#93a3b8;--line:#20293a}}
.sofit-fallback-card{width:100%;max-width:440px;background:var(--card);border:1px solid var(--line);border-radius:20px;
  padding:32px 28px;box-shadow:0 18px 50px -24px rgba(8,16,32,.45);text-align:center}
.sofit-fallback-mark{display:inline-flex;align-items:center;gap:8px;font-weight:700;letter-spacing:-.02em;font-size:19px;color:var(--accent)}
.sofit-fallback-dot{width:9px;height:9px;border-radius:99px;background:var(--accent);box-shadow:0 0 0 4px rgba(31,117,185,.16)}
.sofit-fallback h1{margin:18px 0 8px;font-size:20px;line-height:1.3;letter-spacing:-.02em}
.sofit-fallback p{margin:0;font-size:14.5px;line-height:1.6;color:var(--muted)}
.sofit-fallback-actions{display:flex;flex-direction:column;gap:10px;margin-top:24px}
.sofit-fallback-btn{display:flex;align-items:center;justify-content:center;height:44px;border-radius:12px;border:1px solid transparent;
  font:inherit;font-size:14.5px;font-weight:600;cursor:pointer;text-decoration:none;transition:opacity .15s ease}
.sofit-fallback-btn:hover{opacity:.88}
.sofit-fallback-btn.primary{background:var(--accent);color:#fff}
.sofit-fallback-btn.ghost{background:transparent;color:var(--muted);border-color:var(--line)}
.sofit-fallback-meta{margin-top:20px;padding-top:16px;border-top:1px solid var(--line);font-size:11.5px;color:var(--muted);
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all}
`;

export function ConnectionScreen({ error, retry }: { error?: Error & { digest?: string }; retry?: () => void }) {
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (error) console.error("[sofit] render failed:", error);
  }, [error]);

  function onRetry() {
    setRetrying(true);
    if (retry) retry();
    else window.location.reload();
    // The boundary unmounts on success; if it doesn't, let the user try again.
    setTimeout(() => setRetrying(false), 4000);
  }

  return (
    <div className="sofit-fallback">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="sofit-fallback-card">
        <span className="sofit-fallback-mark">
          <span className="sofit-fallback-dot" aria-hidden="true" />
          SoFit
        </span>

        <h1>We couldn&rsquo;t load this page</h1>
        <p>
          The connection to SoFit didn&rsquo;t complete. This is almost always temporary &mdash; try again, and if it keeps
          happening, clear this site&rsquo;s stored data.
        </p>

        <div className="sofit-fallback-actions">
          <button type="button" className="sofit-fallback-btn primary" onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying…" : "Try again"}
          </button>
          <a className="sofit-fallback-btn ghost" href="/api/reset">
            Clear stored data &amp; sign in again
          </a>
        </div>

        {error?.digest ? <p className="sofit-fallback-meta">Reference: {error.digest}</p> : null}
      </div>
    </div>
  );
}
