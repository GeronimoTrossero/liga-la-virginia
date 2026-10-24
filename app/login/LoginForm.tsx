"use client";
import { useActionState } from "react";
import { login } from "@/app/actions";

export function LoginForm({ usuario, next }: { usuario: string; next: string }) {
  const [state, action, pending] = useActionState(login, {} as { error?: string });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-xs font-semibold text-niebla">Usuario</span>
        <input name="usuario" defaultValue={usuario} autoComplete="username" required className="campo mt-1 w-full text-lg font-bold uppercase tracking-wide" placeholder="V052 · sup-pintos" />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-niebla">PIN</span>
        <input name="pin" type="password" inputMode="numeric" maxLength={8} autoComplete="current-password" required autoFocus={!!usuario} className="campo mt-1 w-full text-xl tracking-[0.5em]" placeholder="••••" />
      </label>
      {state.error && <div role="alert" className="rounded-lg bg-rojo-s px-3 py-2 text-sm font-semibold text-rojo-t">{state.error}</div>}
      <button disabled={pending} className="btn btn-azul w-full py-3 text-base">
        {pending ? "Entrando…" : "Entrar"} <span aria-hidden>›</span>
      </button>
    </form>
  );
}
