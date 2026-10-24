import assert from "node:assert/strict";
import { cumplimiento, score, simular, semaforo, nivelConCandado, puestoPara, type Raw } from "../lib/scoring";

// cumplimiento
assert.equal(cumplimiento(1.2, 1, "up"), 1.1); // tope
assert.equal(cumplimiento(0, 0.03, "down"), 1.1); // real 0 en ↓
assert.ok(Math.abs(cumplimiento(0.06, 0.03, "down") - 0.5) < 1e-9);
assert.ok(Math.abs(cumplimiento(0.585, 0.65, "up") - 0.9) < 1e-9);
// semáforo
assert.equal(semaforo(1), "verde");
assert.equal(semaforo(0.9), "amarillo");
assert.equal(semaforo(0.849), "rojo");
// candado
const sem = { vta: "verde", prd: "verde", act: "verde", lan: "verde", ent: "verde", cob: "rojo", rel: "verde" } as const;
assert.equal(nivelConCandado(96, sem).nivel, "Plata");
assert.equal(nivelConCandado(96, sem).bloqueado, true);
assert.equal(nivelConCandado(80, sem).bloqueado, false);
// puntaje perfecto = 100
const perfecto: Raw = { clientes_cartera: 100, clientes_compradores: 100, clientes_con_lanzamiento: 100, kilos_objetivo: 100, kilos_vendidos: 200, visitas_realizadas: 10, pedidos_levantados: 10, pedidos_no_entregados: 0, cobros_mes: 10, cobros_en_plazo: 10, encuestas_asignadas: 10, encuestas_realizadas: 20 };
assert.ok(Math.abs(score(perfecto).puntaje - 100) < 1e-9);
// simulador: activar un no comprador cambia ACT y el denominador de LAN
const base: Raw = { ...perfecto, clientes_compradores: 80, clientes_con_lanzamiento: 30, cobros_en_plazo: 7 };
const sim = simular(base, [{ clientes_compradores: 1 }]);
assert.ok(sim.despues.reales.lan! < sim.antes.reales.lan!);
assert.equal(sim.puntos, sim.despues.puntaje - sim.antes.puntaje);
assert.equal(puestoPara(90, [95, 91, 89]), 3);
console.log("✅ tests de scoring OK");
