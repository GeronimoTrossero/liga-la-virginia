# Decisiones tomadas sin preguntar

## Datos
- **No vino el xlsx, solo el PDF** (`data/Shippear3_Dataset_Ranking_Vendedores.pdf`, impresión de la hoja partida en 5 tiras de columnas × 37 páginas). Lo extraigo con `scripts/extract-pdf.mjs` (pdfjs, agrupando texto por coordenada Y) a `data/dataset.json`, que es lo que lee el seed. Si aparece el xlsx, basta con regenerar el JSON.
- El PDF trae los `KPI_*` redondeados a 0,1%: la verificación contra los KPIs recalculados usa tolerancia 0,0006 (máx. diferencia real: 0,00055). Las cantidades crudas son exactas.
- Validación oficial OK: Farías Valeria 97,99 · Rojas Martín 97,46 · Moyano Matías 96,29 (≈96,30). Distribución: min 64,4 · media 87,4 · máx 99,0.
- Denominador 0 en un KPI → cumplimiento 100% (neutral). No ocurre en el dataset.

## Reglas
- **Candado**: aplicado tal cual la regla (solo afecta a quien llegaría a Oro/Diamante con Venta o Cobranzas en rojo). Resultado: **1,4%** de vendedor-mes bloqueados (22). El "~15–20%" esperado coincide con el % de vendedor-mes con **Venta o Cobranzas en rojo (18,7%)**: lo mostramos como "en riesgo de candado". No cambié la regla para forzar el número.
- Temporada anual = 2025-11 a 2026-10, etiquetada "2025/26".
- Rankings por KPI: desempate por puntaje total (muchos empatan en el tope de 110%).
- Figuritas holo: a partir del 3er mes en que el vendedor sale 1° en el mismo KPI.

## Datos demo (mes en curso 2026-10, hoy = 24/10/2026)
- **Cobros pendientes agrupados por cliente**: cada cliente con deuda tiene 1–4 facturas (`cliente_demo.facturas`); la suma de facturas = Cobros_Mes − Cobros_en_Plazo. Cobrar un cliente suma sus facturas a Cobros_en_Plazo. Sin esto ningún vendedor bloqueado del dataset se desbloquea con 2–4 acciones (el más cercano necesita 9 cobros).
- Un cobro vencido que se cobra en el mes cuenta como "en plazo" para la simulación (simplificación de demo).
- **Vendedor de demo: V052 Mansilla Germán (Córdoba/Rio Cuarto)**: 90,80 pts, Oro bloqueado en Plata por Cobranzas (82,2%). Sus 3 deudores principales tienen 3 facturas cada uno → cobrar esos 3 lo desbloquea.
- Clientes demo: solo los accionables (no compradores, compradores sin lanzamiento, deudores, sin relevar, no entregados) ≈ 31k filas; ~30% de no compradores estacionales. Teléfonos ficticios (54911 5xxx xxxx).
- Venta por familia: 6 familias que suman exacto Kilos_Objetivo / Kilos_Vendidos, con 1–2 familias flojas.

## Infra
- **`NEXT_PUBLIC_SUPABASE_URL` en `.env.local` apuntaba a la URL del dashboard** (`supabase.com/dashboard/project/<ref>/...`). La corregí a `https://<ref>.supabase.co` y además `lib/supabase.ts` normaliza ese formato por si se pega igual en Vercel.
- `DATABASE_URL` vacía: el schema se aplicó con el conector de Supabase. `npm run migrate` sigue funcionando con `pg` si se completa `DATABASE_URL` (o se pega `supabase/schema.sql` en el SQL Editor).
- `WEBHOOK_SECRET` vacío → lo generé en `.env.local` (hay que copiarlo a Vercel).
- Sin `ANTHROPIC_API_KEY`, sin n8n/Twilio, sin Vercel CLI (ajustes finales del brief): Comodín Dibu con plantillas, cobranza solo simulada, deploy lo importás vos desde vercel.com.
- Sin auth real: selector "Ver como" en cookie. **En producción: login + RLS por rol** (vendedor ve su detalle y solo puesto/puntaje de los demás; supervisor ve a sus dependientes).
- Puntajes en pantalla se calculan en el servidor con `lib/scoring.ts` desde `kpi_mes` (+ `ajuste_kpi` del mes en curso). `score_mes`/`score_anual` quedan precalculados por el seed para consumo externo y para el Balón de Oro.
- En esta máquina hay intercepción TLS (antivirus/proxy): `npm run dev:local` arranca Next con `--use-system-ca`. En Vercel no hace falta.
- Cada redeploy en Vercel no toca la base: para repetir la demo usá "↺ Reiniciar demo" en la vista vendedor (borra ajustes y bandeja de ese vendedor).

## UX
- Revelación excluye al ganador de Remontada (si no, suele ser la misma persona y se pierde un protagonista).
- Clásicos: Litoral (Santa Fe–Rosario), Norte (Tucumán–Salta), Costa (Mar del Plata–Bahía Blanca), Cuyo vs Centro (Mendoza–Córdoba), NEA (Resistencia–Posadas). Marcador = KPIs ganados.
- Copa Derbi: la tiene la sucursal #1 de la liga de sucursales del mes; se muestran los últimos 3 tenedores.
- Rutas `/regional/[nombre]` reutilizan la vista de supervisor con todo el equipo regional.

## V2 (prompt maestro V2)
- **Datos reales: 135 vendedores y 15 sucursales** (el prompt V2 dice 140/16; mandan los datos).
- **Login**: tabla `usuario` + PIN con scrypt + JWT HS256 (`jose`) en cookie httpOnly 12 h. `AUTH_SECRET` opcional: si falta se deriva de la service role, así no hay que cargar otra env var en Vercel.
- **Supervisores con apellido repetido** (Ceballos Natalia / Ceballos Romina): el id es `sup-<apellido>-<nombre>`. El resto `sup-<apellido>` (ej. `sup-pintos`).
- **Sin anon**: se borraron las políticas SELECT públicas (`schema-v2.sql`); verificado con la REST API (devuelve `[]`). La anon key ya no se usa.
- **SWR en vez de Realtime**: polling cada 2 s a `/api/live`, que devuelve una firma (conteo + último id) de `ajuste_kpi`, `automation_log`, `reconocimiento` y `mision_equipo`, filtrada por los vendedores visibles para la sesión. Si cambia, `router.refresh()` vuelve a renderizar los Server Components (el cálculo sigue en el servidor).
- **Modo presentador**: `<details>` discreto en el footer, solo con sesión iniciada; re-emite la cookie para el usuario elegido. Apagable con `MODO_PRESENTADOR=off`.
- **Rutas por rol**: vendedor → solo `/vendedor/<su id>`; supervisor → `/supervisor/<su nombre>`, el detalle de sus vendedores y `/liga`; gerencia → todo (`/liga`, `/temporada`, `/regional/*`).
- **Nivel mensual vs nivel de temporada**: la carta muestra el nivel mensual (umbrales absolutos + candado); el nivel de temporada es por percentil sobre el promedio de los 3 meses: Diamante top 5%, Oro siguiente 20%, Plata siguiente 40%, Bronce resto (interpreté los % como tramos consecutivos).
- **Temporadas**: Nov–Ene, Feb–Abr, May–Jul, Ago–Oct. La actual (Ago–Oct 2026) incluye octubre en vivo.
- **Rachas**: se cuentan sobre meses cerrados; el mes en curso muestra estado (viva / protegida / en riesgo / arrancala) sin consumir protectores todavía. "En riesgo" = había racha y el KPI hoy no está en verde (ni cubierto por protector).
- **Protector**: +1 por mes con podio general, podio en algún KPI o 2+ misiones individuales cumplidas; tope según nivel mensual (Bronce 0). Se consumen en orden VTA, COB, REL, ENT.
- **Puntos de Liga**: misiones = las 4 individuales del mes (Lanzamiento Total, Cobranza Limpia, Cero Rebotes, Relevamiento Perfecto; + Copa del Café en junio), evaluadas para todos los meses.
- **Tu Liga**: 14 divisiones de 9–10 armadas por el promedio de la temporada anterior; dentro se ordena por promedio de la temporada actual (desempate: Puntos de Liga). Nombres de café (Ristretto, Espresso…).
- **Misión colectiva**: por equipo de supervisor (no por sucursal), elegible entre 3; default "Nadie en rojo en Cobranzas".
- **Cinta de Capitán**: sucursal con la cadena más larga de meses con promedio ≥ promedio nacional. **MVP**: mayor mejora de puntaje vs mes anterior dentro de la sucursal. **DT del Mes**: supervisor con mayor mejora del promedio del equipo.
- **Adopción** en la vista gerencia es un dato **simulado** (83%) y está rotulado así.
- **Agente de góndola**: persiste el resultado (marca clientes relevados + `ajuste_kpi` de encuestas) para que impacte en vivo; `Reiniciar demo` lo revierte. El vendedor demo (V052) tiene solo 1 encuesta pendiente: el agente completa "hasta 5".
- **Álbum de figuritas** fuera de la vista vendedor (pedido V2). Las figuritas siguen en la base y alimentan los protectores (podio por KPI).
