"use client";

import { ConnectionScreen } from "@/components/system/connection-screen";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ConnectionScreen error={error} retry={unstable_retry} />;
}
