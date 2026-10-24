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
