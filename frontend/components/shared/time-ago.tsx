"use client";

import { useEffect, useState } from "react";
import { formatRelative } from "@/lib/utils";

export function TimeAgo({
  date,
  className,
}: {
  date: string | Date;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) {
    return (
      <span suppressHydrationWarning className={className}>
        —
      </span>
    );
  }
  return (
    <span suppressHydrationWarning className={className}>
      {formatRelative(date)}
    </span>
  );
}
