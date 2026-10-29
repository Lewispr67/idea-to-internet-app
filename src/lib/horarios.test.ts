import { describe, expect, it } from "vitest";
import { AULAS, DATOS_PRUEBA, detectarChoques, moverADia, resolverChoques, type Clase } from "./horarios";

const base: Clase = { id: "x", materia: "M", seccion: "A", docente: "D", aula: "A1", dia: "Lunes", hora_inicio: "08:00", hora_fin: "10:00" };

describe("horarios", () => {
  it("hay 18 aulas de A1 a F3", () => {
    expect(AULAS.length).toBe(18);
    expect(AULAS[0]).toBe("A1");
    expect(AULAS[17]).toBe("F3");
  });
  it("detecta choques de aula y docente en los datos de prueba", () => {
    const m = detectarChoques(DATOS_PRUEBA);
    expect(m.get("2")?.some((c) => c.tipo === "aula")).toBe(true);
    expect(m.get("3")?.some((c) => c.tipo === "docente")).toBe(true);
    expect(m.has("10")).toBe(false);
  });
  it("clases contiguas no chocan", () => {
    expect(detectarChoques([{ ...base, id: "a" }, { ...base, id: "b", hora_inicio: "10:00", hora_fin: "12:00" }]).size).toBe(0);
  });
  it("resolver deja cero choques en los datos de prueba", () => {
    const r = resolverChoques(DATOS_PRUEBA);
    expect(detectarChoques(r.clases).size).toBe(0);
    expect(r.pendientes.length).toBe(0);
  });
  it("prioridad 1: cambia aula sin tocar día ni hora", () => {
    const r = resolverChoques([{ ...base, id: "a" }, { ...base, id: "b", docente: "Otro" }]);
    const b = r.clases[1]!;
    expect(b.aula).toBe("A2");
    expect([b.dia, b.hora_inicio]).toEqual(["Lunes", "08:00"]);
  });
  it("prioridad 2: si todas las aulas están ocupadas, mueve el horario el mismo día", () => {
    const llenas = AULAS.map((aula, i) => ({ ...base, id: `o${i}`, docente: `D${i}`, aula }));
    const r = resolverChoques([...llenas, { ...base, id: "n", docente: "Nuevo" }]);
    const n = r.clases.at(-1)!;
    expect(n.dia).toBe("Lunes");
    expect(n.hora_inicio).toBe("10:00");
  });
  it("prioridad 3: si el día está lleno, cambia de día", () => {
    const dia = AULAS.map((aula, i) => ({ ...base, id: `f${i}`, docente: `F${i}`, aula, hora_inicio: "07:00", hora_fin: "22:00" }));
    const r = resolverChoques([...dia, { ...base, id: "n", docente: "Nuevo" }]);
    expect(r.clases.at(-1)!.dia).toBe("Martes");
  });
  it("prioridad 4: sin opción, queda pendiente y moverADia aplica el día elegido", () => {
    const todo = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].flatMap((dia) =>
      AULAS.map((aula, i) => ({ ...base, id: `${dia}${i}`, docente: `${dia}${i}`, aula, dia, hora_inicio: "07:00", hora_fin: "22:00" })));
    const r = resolverChoques([...todo, { ...base, id: "n", docente: "Nuevo" }]);
    expect(r.pendientes.map((p) => p.id)).toEqual(["n"]);
    const m = moverADia(r.clases, "n", "Sábado");
    expect(m.ok).toBe(true);
    expect(m.clase?.dia).toBe("Sábado");
  });
});
