"use client";
import { useActionState } from "react";
import { login } from "@/app/actions";

export function LoginForm({ usuario, next }: { usuario: string; next: string }) {
  const [state, action, pending] = useActionState(login, {} as { error?: string });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-widest text-niebla">Usuario</span>
        <input name="usuario" defaultValue={usuario} autoComplete="username" required className="mt-1 w-full rounded-lg border border-linea bg-noche px-3 py-2.5 font-display text-xl font-bold uppercase tracking-wide text-tiza outline-none focus:border-acento" placeholder="V052 · sup-pintos · gerencia" />
      </label>
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-widest text-niebla">PIN</span>
        <input name="pin" type="password" inputMode="numeric" maxLength={8} autoComplete="current-password" required autoFocus={!!usuario} className="mt-1 w-full rounded-lg border border-linea bg-noche px-3 py-2.5 font-display text-2xl tracking-[0.5em] text-tiza outline-none focus:border-acento" placeholder="••••" />
      </label>
      {state.error && <div className="rounded-lg bg-lv/20 px-3 py-2 text-sm text-red-200">{state.error}</div>}
      <button disabled={pending} className="w-full rounded-lg bg-lv py-3 font-display text-xl font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(228,0,43,.5)] disabled:opacity-60">
        {pending ? "Entrando a la cancha…" : "Entrar a la cancha"}
      </button>
    </form>
  );
}
