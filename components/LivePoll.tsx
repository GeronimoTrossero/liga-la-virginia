"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";

const fetcher = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json() as Promise<{ v?: string }>);

/** Polling SWR cada 2 s a /api/live (filtrada por sesión). Si cambió algo, refresca los Server Components. */
export function LivePoll() {
  const router = useRouter();
  const last = useRef<string | null>(null);
  const { data } = useSWR("/api/live", fetcher, { refreshInterval: 2000, revalidateOnFocus: true });
  useEffect(() => {
    if (!data?.v) return;
    if (last.current && last.current !== data.v) router.refresh();
    last.current = data.v;
  }, [data, router]);
  return null;
}
