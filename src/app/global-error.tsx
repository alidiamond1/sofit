"use client";

import { ConnectionScreen } from "@/components/system/connection-screen";

/* Replaces the root layout entirely, so it must render its own html/body. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>SoFit — connection problem</title>
        <ConnectionScreen error={error} retry={unstable_retry} />
      </body>
    </html>
  );
}
