"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/** Supabase Realtime: cuando entra un pago (ajuste_kpi / cliente_demo / automation_log) refresca la vista. */
export function LiveRefresh({ url, anonKey, ids: idsCsv }: { url: string; anonKey: string; ids?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (!url || !anonKey) return;
    const sb = createClient(url, anonKey);
    let t: ReturnType<typeof setTimeout> | null = null;
    const ids = idsCsv ? new Set(idsCsv.split(",")) : null;
    const onChange = (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
      const vid = (payload.new?.vendedor_id ?? payload.old?.vendedor_id) as string | undefined;
      if (ids && vid && !ids.has(vid)) return;
      if (t) clearTimeout(t);
      t = setTimeout(() => router.refresh(), 300);
    };
    const ch = sb
      .channel("liga-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "ajuste_kpi" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "cliente_demo" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_log" }, onChange)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      sb.removeChannel(ch);
    };
  }, [url, anonKey, router, idsCsv]);
  return null;
}
