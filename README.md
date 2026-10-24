# ⚽ Liga La Virginia

**Shippear #3 · Desafío Ranking de Vendedores.** Los KPIs mensuales de los 135 vendedores de La Virginia convertidos en un juego **visual, no un CRM**: cada vendedor es una carta estilo FIFA, hay ranking completo (mensual y anual), niveles estilo Uber Pro con candado, misiones mensuales, figuritas, clásicos entre sucursales y **"Mejorá tu carta"**, que le dice a cada vendedor exactamente qué hacer para sumar puntos. Además, una **cobranza en piloto automático** (simulada) que, cuando el cliente responde "ya pagué", sube la carta en vivo.

- **Repo:** https://github.com/GeronimoTrossero/liga-la-virginia
- **Producción:** _(importar en vercel.com; ver "Deploy")_

## Cómo correrlo

```bash
npm i
npm run migrate   # aplica supabase/schema.sql (requiere DATABASE_URL; alternativa: pegarlo en el SQL Editor)
npm run seed      # lee data/dataset.json, valida la fórmula, calcula todo y carga Supabase
npm run dev       # http://localhost:3000  (detrás de un proxy/antivirus con TLS: npm run dev:local)
npm test          # tests de lib/scoring.ts
npm run validate  # test de validación oficial (top 3 de 2026-10 y distribución)
```

Variables: ver `.env.example`. Para Vercel: `NEXT_PUBLIC_SUPABASE_URL` (`https://<ref>.supabase.co`), `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_SECRET`. Opcional `ANTHROPIC_API_KEY` (Comodín Dibu con IA; sin key usa plantillas).

## Arquitectura (10 líneas)

1. **Next.js 15** (App Router, TS, Tailwind 4, framer-motion) + **Supabase** (Postgres + Realtime). Deploy en Vercel.
2. **`lib/scoring.ts` es la única fuente de verdad del cálculo** (cumplimiento, puntaje, semáforo, nivel + candado, simulador). La usan el seed, el servidor y el simulador del browser.
3. `scripts/extract-pdf.mjs` → `data/dataset.json` (el dataset vino en PDF). `scripts/seed.ts` valida la fórmula y precalcula `score_mes`, `score_anual`, figuritas, misiones y datos demo.
4. Las pantallas recalculan el mes con `lib/scoring.ts` desde `kpi_mes` **+ `ajuste_kpi`** (ajustes en vivo del mes en curso, ej. un pago).
5. Lecturas: Server Components con la **anon key** (RLS: SELECT público en las tablas del juego).
6. Escrituras: solo en el servidor (API routes / Server Actions) con la **service role key**, nunca expuesta al browser.
7. **Realtime** en `ajuste_kpi`, `cliente_demo` y `automation_log`: la carta se refresca sola cuando entra un pago.
8. Sin auth: selector **"Ver como"** (vendedor / supervisor / regional / gerencia) en cookie. **En producción: login + RLS por rol.**
9. `POST /api/ai/dibu`, `POST /api/automations/cobranza/run` y `POST /api/webhooks/pago` (estos dos con `x-webhook-secret`).
10. "Hoy" de la demo: **24/10/2026** (`NEXT_PUBLIC_DEMO_TODAY`), octubre 2026 = mes en curso.

## Fórmula oficial

| KPI | Real | Objetivo | Sentido | Peso | Carta |
|---|---|---|---|---|---|
| Venta vs OV | Kilos_Vendidos / Kilos_Objetivo | 100% | ↑ | 30% | VTA |
| Productividad | Pedidos_Levantados / Visitas_Realizadas | 65% | ↑ | 10% | PRD |
| No compradores | (Cartera − Compradores) / Cartera | 15% | ↓ | 15% | ACT |
| Últ. lanzamientos | Con_Lanzamiento / Compradores | 40% | ↑ | 15% | LAN |
| No entregados | No_Entregados / Pedidos_Levantados | 3% | ↓ | 10% | ENT |
| Cobranzas | Cobros_en_Plazo / Cobros_Mes | 90% | ↑ | 15% | COB |
| Relevamientos | Encuestas_Realizadas / Asignadas | 100% | ↑ | 5% | REL |

Cumplimiento ↑ = real/objetivo; ↓ = objetivo/real (real 0 → 110%). Tope 110%. **Puntaje = Σ(peso × cumplimiento) / 1,10 × 100.**
Validación (2026-10): Farías Valeria 97,99 · Rojas Martín 97,46 · Moyano Matías 96,29. Global: min 64,4 · media 87,4 · máx 99,0. ✅

## Reglas nuestras

- **Semáforo** por KPI (sobre cumplimiento): 🟢 ≥ 100% · 🟡 85–99,9% · 🔴 < 85%.
- **Niveles**: 💎 Diamante ≥ 95 · 🥇 Oro ≥ 90 · 🥈 Plata ≥ 85 · 🥉 Bronce < 85.
- **Candado**: no podés ser Oro ni Diamante con **Venta o Cobranzas en rojo** → "🔒 Bloqueado en Plata". Afecta al 1,4% de vendedor-mes; el 18,7% tiene Venta o Cobranzas en rojo (en riesgo).
- **Balón de Oro**: promedio de los 12 meses. **Remontada**: más puestos subidos. **Revelación**: (pt − pt−1)/(100 − pt−1).
- **Clásicos**: un gol por cada KPI con mejor cumplimiento promedio. **Copa Derbi** rodante para la sucursal #1 del mes.
- **Figuritas**: podio por KPI cada mes (oro/plata/bronce); holo = 1° en el mismo KPI 3+ meses.
- "Mejorá tu carta": los puntos de una acción son siempre `puntaje(con cambio) − puntaje(actual)`.

## Pantallas

- `/` Home: podio del mes en curso y accesos.
- `/vendedor/[id]` (mobile-first): carta, mi posición + ranking completo (solo puesto/puntaje/nivel de los demás), **⭐ Mejorá tu carta** con simulador, cobranza en piloto automático + bandeja, misiones, álbum.
- `/supervisor/[nombre]` y `/regional/[nombre]`: kilos del equipo vs objetivo, puntaje promedio, puesto del equipo, **mapa de calor vendedores × 7 KPIs**, podio, alertas, cartas, automatizaciones.
- `/liga`: podio, Remontada, Revelación, clásico Interior vs GBA, ranking con filtros (mes/anual, sucursal, regional, tipo, por KPI), Balón de Oro, clásicos, Copa Derbi, liga de sucursales, premios.

## 🎬 Guion de demo (3 minutos)

**Vendedor de demo: V052 · Mansilla Germán (Córdoba/Rio Cuarto)** — 90,8 pts, sería Oro pero está **🔒 bloqueado en Plata por Cobranzas (82%)**. Cobrando sus 3 deudores más vencidos (3+4+3 facturas) se desbloquea.

1. Home → "Soy vendedor" (o "Ver como" → Mansilla Germán). Mostrar la carta plateada con el candado y "#54 de 135 · subiste 26 puestos".
2. **⭐ Mejorá tu carta** → abrir **COB** (barra roja, tramo fantasma, "+X pts posibles") → tildar los 3 primeros clientes vencidos → la carta pasa a **Oro** en vivo: "**+0,4 pts → subís al #50 · 🔓 desbloqueás Oro**".
3. Tocar **🧤 Dibu** en uno: aparece el WhatsApp redactado con monto y vencimiento → "Abrir WhatsApp" (wa.me).
4. Bajar a **🤖 Cobranza en piloto automático** → **⏩ Simular: pasaron 5 días** → la bandeja muestra los recordatorios → **💬 El cliente respondió: "Ya pagué"** → la carta sube sola (Realtime) y la bandeja marca "pagado".
5. "Ver como" → supervisor **Pintos Maximiliano**: mapa de calor, alertas ("1 vendedor bloqueado por Cobranzas"), panel de automatizaciones con el pago recién entrado.
6. **Liga**: podio holográfico, Balón de Oro, Remontada / Revelación, clásico **Interior vs GBA** con marcador, Copa Derbi.

Para repetir la demo: botón **↺ Reiniciar demo** en la vista vendedor.

## Roadmap de automatizaciones

- Aviso previo de entrega (día anterior, con ventana horaria) para bajar No entregados.
- Baja estacional sugerida automáticamente (clientes estacionales sin compra 2 meses).
- Resumen por WhatsApp el día 1: tu carta, tu puesto y las 3 acciones que más suman.
- Alertas al supervisor (vendedor que cae 10+ puestos o queda bloqueado).
- Cierre de mes automático: congela puntajes, entrega figuritas y premios.
- Conexión real: n8n + Twilio WhatsApp sobre `/api/automations/cobranza/run` y `/api/webhooks/pago` (ya protegidos con `x-webhook-secret`).

Ver `DECISIONS.md` para todo lo que decidimos sin preguntar. Datos 100% ficticios.
