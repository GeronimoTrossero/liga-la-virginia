# ⚽ Liga La Virginia

**Shippear #3 · Desafío Ranking de Vendedores**

> Los reportes mensuales de 135 vendedores y 15 sucursales, convertidos en **un BI visual que se juega** y en **agentes de IA que hacen el trabajo administrativo por el vendedor**, para que el vendedor solo venda.

- **Producción:** https://liga-la-virginia.vercel.app
- **Repo:** https://github.com/GeronimoTrossero/liga-la-virginia
- **Demo:** usuarios `V052` (vendedor), `sup-pintos` (supervisor) y `gerencia`. PIN `1234`.

---

## 1. Propuesta de valor

| Hoy | Con Liga La Virginia |
|---|---|
| Una planilla mensual con 7 KPIs que nadie mira hasta el cierre | Una **carta de jugador** con semáforos, que el vendedor mira en la calle todos los días |
| "Estás 82% en cobranzas" | "**Cobrá a estos 3 clientes → +0,4 pts, subís al #50 y desbloqueás Oro**" |
| El supervisor descubre los problemas a fin de mes | **Mapa de calor** del equipo, rachas en riesgo y misión colectiva en vivo |
| El vendedor pierde horas mandando recordatorios y llenando encuestas | Un **agente de cobranzas** por WhatsApp y un **agente de relevamiento** que lee la foto de la góndola |
| Competencia que desmotiva a la mitad de abajo | **Ligas de 10 de nivel parecido**, rachas, MVP del que más mejoró y misiones colectivas |

Tres pilares:

1. **Núcleo de negocio: BI visual y scorecard.** Los 7 KPIs oficiales con su fórmula exacta, semáforos, cartas estilo FIFA, mapa de calor, filtros por mes, sucursal, regional, tipo y KPI.
2. **Gamificación avanzada (Duolingo + figuritas).** Temporadas trimestrales con niveles por percentil, ligas de ~10 con ascensos y descensos, rachas con protector, misiones individuales y colectivas, derbis, MVP, DT del Mes y Muro de la Fama.
3. **Agentes de IA autónomos.** Comodín Dibu, que redacta el WhatsApp de cobranza. El Agente de Cobranzas Autónomo recuerda, escucha el "ya pagué" e impacta el KPI. El Agente de Relevamiento Visual convierte una foto de góndola en encuestas completas.

## 2. Arquitectura

```
Browser (mobile-first)  ──SWR polling 2s──▶  /api/live (firma de cambios filtrada por sesión)
        │                                              │
        ▼                                              ▼
Next.js 15 App Router ── Server Components / Server Actions / API routes ── service role ──▶ Supabase Postgres
        │                     │                                                          (RLS ON, 0 políticas anon)
   middleware JWT       lib/scoring.ts  ← única fuente de verdad del Puntaje Oficial
   (cookie firmada)     lib/game.ts     ← Puntos de Liga, rachas, temporadas, ligas
                        lib/acciones.ts ← "Mejorá tu carta" (acciones = deltas sobre datos crudos)
                        lib/automation.ts ← agentes (cobranza, góndola, Dibu)
```

- **Login real:** tabla `usuario` (rol `VENDEDOR`, `SUPERVISOR` o `GERENCIA`) con PIN hasheado con scrypt. La sesión es un JWT HS256 en una cookie httpOnly y un middleware redirige según el rol. El vendedor solo ve su carta. El supervisor ve a su equipo y el detalle de sus vendedores. Gerencia ve todo.
- **Sin acceso anónimo:** RLS activado y ninguna política para `anon` (probado: la API REST con la anon key devuelve `[]`). Todas las lecturas pasan por el servidor con la service role, filtradas por la sesión.
- **Tiempo real sin Realtime:** SWR consulta `/api/live` cada 2 segundos. Cuando cambia la firma (ajustes, bandeja, reconocimientos), refresca los Server Components.
- **Las dos monedas nunca se mezclan:**
  - **Puntaje Oficial:** los 7 KPIs, en `lib/scoring.ts`. Define ranking, podio y Balón de Oro.
  - **Puntos de Liga:** en `lib/game.ts`. Alimentan beneficios y desempates.
- **Datos:** `scripts/extract-pdf.mjs` genera `data/dataset.json` (el dataset vino en PDF). `scripts/seed.ts` valida la fórmula y carga todo; `scripts/seed-usuarios.ts` carga los usuarios.

### Fórmula oficial (intocable)

| KPI | Real | Objetivo | Sentido | Peso |
|---|---|---|---|---|
| VTA Venta vs OV | Kilos_Vendidos / Kilos_Objetivo | 100% | ↑ | 30% |
| PRD Productividad | Pedidos / Visitas | 65% | ↑ | 10% |
| ACT No compradores | (Cartera − Compradores) / Cartera | 15% | ↓ | 15% |
| LAN Últ. lanzamientos | Con_Lanzamiento / Compradores | 40% | ↑ | 15% |
| ENT No entregados | No_Entregados / Pedidos | 3% | ↓ | 10% |
| COB Cobranzas | Cobros_en_Plazo / Cobros_Mes | 90% | ↑ | 15% |
| REL Relevamientos | Realizadas / Asignadas | 100% | ↑ | 5% |

- **Cumplimiento:** con tope de 110%. **Puntaje** = Σ(peso × cumplimiento) / 1,10 × 100.
- **Validación de la fórmula (2026-10):** Farías 97,99 · Rojas 97,46 · Moyano 96,29. ✅
- **Semáforo:** 🟢 ≥ 100% · 🟡 85–99,9% · 🔴 < 85%.
- **Nivel mensual:** 💎 ≥ 95 · 🥇 ≥ 90 · 🥈 ≥ 85 · 🥉 < 85.
- **Candado:** con VTA o COB en rojo no podés ser Oro ni Diamante. La carta muestra "🔒 Bloqueado en Plata".

### Gamificación (moneda 2: Puntos de Liga)

- **Puntos de Liga:** (10 × KPI verde + 4 × KPI amarillo + 20 × misión cumplida + 30 si ganó la Remontada) × **multiplicador de racha general**.
  - La racha general cuenta los meses seguidos con VTA y COB sin rojo.
  - Multiplicador: menos de 3 meses ×1; de 3 a 5 ×1,1; de 6 a 11 ×1,25; 12 meses ×1,5.
- **Temporadas trimestrales:** la actual es Ago–Oct 2026 y su pantalla de cierre está activa. El nivel de temporada sale del promedio de los 3 meses, por percentil: Diamante top 5%, Oro los siguientes 20%, Plata los siguientes 40% y Bronce el resto.
- **Rachas** en VTA, COB, REL y ENT, con llama 🔥.
  - **Protector 🛡️:** se gana con podio general, podio en un KPI o 2+ misiones. Tope según nivel: Plata 1, Oro 2, Diamante 3.
  - Un KPI que cierra en amarillo consume un protector y la racha sigue; en rojo, la racha se rompe.
  - **Racha en riesgo:** banner con lo que falta ("faltan 4 cobros").
- **Tu Liga:** 14 divisiones de ~10 vendedores (Liga Ristretto, Espresso…), armadas con la temporada anterior. Al cierre suben los 3 primeros y bajan los 3 últimos.
- **Incentivos colectivos:**
  - Misión colectiva elegida por el supervisor, con premio Tercer Tiempo.
  - Cinta de Capitán para la sucursal con la cadena más larga sobre el promedio nacional.
  - MVP del equipo: el que más mejoró dentro de su sucursal.
  - DT del Mes y derbis entre sucursales, con un gol por cada KPI ganado; Interior vs GBA y Copa Derbi rodante.
  - Remontada, Revelación y Muro de la Fama.

## 3. Impacto operativo de los agentes de IA

| Agente | Qué hace | Ahorro estimado* |
|---|---|---|
| 🧤 **Comodín Dibu** | Redacta el WhatsApp de cobranza, lanzamiento o aviso de entrega con monto y vencimiento reales. Usa Anthropic (`claude-haiku-5-5`) si hay `ANTHROPIC_API_KEY`; si no, plantillas. Nunca inventa cifras. | ~2 min por mensaje |
| 🤖 **Agente de Cobranzas Autónomo** | Detecta los vencimientos de los próximos 5 días, manda el recordatorio y, cuando el cliente responde "ya pagué", marca el pago, suma el cobro al KPI y la carta sube sola. Endpoints listos para n8n + Twilio (`/api/automations/cobranza/run`, `/api/webhooks/pago` con `x-webhook-secret`). | 1–2 h por semana por vendedor |
| 📸 **Agente de Relevamiento Visual** | Desde una foto de la góndola "lee" frentes, faltantes y precios y completa hasta 5 encuestas de una vez (simulado en la demo). | ~5 min por encuesta |

\* Estimaciones para el pitch, no medidas. En la demo los agentes corren en **modo simulado** dentro de la app.

## 4. 🎬 Guion de demo (3 minutos)

**Vendedor de demo: V052 · Mansilla Germán (Córdoba/Rio Cuarto).** Tiene 90,8 pts, que lo pondrían en Oro, pero está **🔒 bloqueado en Plata por Cobranzas (82%)**.

1. **Carta bloqueada.** En la Home, "Soy Vendedor" lleva al login con `V052` y PIN `1234`. Se ve la carta plateada con el candado, el puesto #54 de 135, las rachas (🔥 12 meses en Venta) y Tu Liga.
2. **Mejorá tu carta.** Abrir el desplegable **Cobranzas**, que muestra la lista de clientes por cobrar con monto y vencimiento. Al tildar los 3 primeros, el simulador muestra **"+0,4 pts → subís al #50 · 🔓 desbloqueás Oro"** y la carta se vuelve dorada en vivo.
3. **Comodín Dibu.** Tocar 🧤 en un cliente: aparece el WhatsApp redactado y el botón "Abrir WhatsApp" (wa.me).
4. **Pago en vivo.** En el Agente de Cobranzas, tocar **⏩ Simular: pasaron 5 días** y después **💬 "Ya pagué"**: el cobro se registra y la carta sube sola (SWR).
   - Bonus: en **Relevamientos**, "📸 Subir foto de góndola" completa las encuestas pendientes.
5. **Supervisor.** En el footer, abrir 🎬 modo presentador y elegir "Pintos Maximiliano". Se ven el **mapa de calor** de 7 KPIs, las alertas, las rachas en riesgo, la misión colectiva (elegirla en vivo) y el botón 👏 Reconocer.
6. **Ligas y derbis.** En el modo presentador, elegir Gerencia para ver La transmisión: kilos del país, adopción, DT del Mes, Cinta de Capitán, podio holográfico, clásico Interior vs GBA, derbis, Balón de Oro y Muro de la Fama. Después pasar a **Temporada** para ver el cierre Ago–Oct con ascensos y descensos por división.

Para repetir: **↺ Reiniciar demo** en la vista del vendedor.

## Cómo correrlo

```bash
npm i
npm run migrate        # schema.sql + schema-v2.sql (requiere DATABASE_URL; alternativa: SQL Editor)
npm run seed           # valida la fórmula, carga datos, juego y usuarios (PIN 1234)
npm run dev            # http://localhost:3000   (con proxy/antivirus TLS: npm run dev:local)
npm test && npm run validate
```

**Variables de entorno:**
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `WEBHOOK_SECRET`.
- Opcionales:
  - `AUTH_SECRET`: si falta, se deriva de la service role.
  - `ANTHROPIC_API_KEY`.
  - `MODO_PRESENTADOR=off`: apaga el selector de roles del footer.

`NEXT_PUBLIC_SUPABASE_ANON_KEY` ya no es necesaria: no hay lecturas anónimas.

## Roadmap

- Conectar n8n + Twilio a los endpoints que ya existen.
- Usar visión real (Claude) en el agente de góndola.
- Aviso previo de entrega para bajar No entregados.
- Baja estacional sugerida.
- Resumen por WhatsApp el día 1.
- Cierre de mes y de temporada automáticos.
- Medir la adopción real.

Ver `DECISIONS.md` para todo lo que decidimos sin preguntar. Datos 100% ficticios.
