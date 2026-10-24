"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { elegirMisionEquipo, reconocer } from "@/app/actions";

const FRASES = ["¡Golazo este mes! Seguí así 💪", "Gran laburo con la cobranza 👏", "Sos ejemplo para el equipo ⭐", "Esa remontada fue de crack 🚀"];

export function ReconocerBtn({ vendedorId, nombre }: { vendedorId: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(FRASES[0]);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  if (ok) return <span className="text-xs font-bold text-verde">👏 enviado</span>;
  return (
    <span className="relative">
      <button onClick={() => setOpen(!open)} className="rounded-md border border-acento/50 px-1.5 py-0.5 text-xs text-acento hover:bg-acento/10" title={`Reconocer a ${nombre}`}>👏</button>
      {open && (
        <div className="absolute right-0 top-7 z-30 w-64 rounded-lg border border-linea bg-panel p-3 text-left shadow-xl">
          <div className="mb-1 text-xs font-bold">Reconocer a {nombre}</div>
          <select value={msg} onChange={(e) => setMsg(e.target.value)} className="w-full rounded border border-linea bg-noche p-1.5 text-xs">
            {FRASES.map((f) => <option key={f}>{f}</option>)}
          </select>
          <button disabled={pending} onClick={() => start(async () => { await reconocer(vendedorId, msg); setOk(true); setOpen(false); })} className="mt-2 w-full rounded bg-acento py-1 text-xs font-bold text-noche disabled:opacity-50">Enviar reconocimiento</button>
        </div>
      )}
    </span>
  );
}

export function ElegirMision({ opciones, actual, editable }: { opciones: { key: string; titulo: string; icono: string }[]; actual: string; editable: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!editable) return null;
  return (
    <select disabled={pending} value={actual} onChange={(e) => start(async () => { await elegirMisionEquipo(e.target.value); router.refresh(); })} className="rounded-lg border border-linea bg-noche px-2 py-1.5 text-sm">
      {opciones.map((o) => <option key={o.key} value={o.key}>{o.icono} {o.titulo}</option>)}
    </select>
  );
}
