import { describe, expect, it } from "vitest";
import { DATOS_PRUEBA, detectarChoques, resolverChoques } from "./horarios";

describe("horarios", () => {
  it("detecta choques de aula y docente en los datos de prueba", () => {
    const m = detectarChoques(DATOS_PRUEBA);
    expect(m.get("2")?.some((c) => c.tipo === "aula")).toBe(true);
    expect(m.get("3")?.some((c) => c.tipo === "docente")).toBe(true);
    expect(m.get("9")?.some((c) => c.tipo === "docente")).toBe(true);
    expect(m.has("10")).toBe(false);
  });
  it("clases contiguas (fin == inicio) no chocan", () => {
    const a = { ...DATOS_PRUEBA[0]!, id: "a", hora_inicio: "08:00", hora_fin: "10:00" };
    const b = { ...a, id: "b", hora_inicio: "10:00", hora_fin: "12:00" };
    expect(detectarChoques([a, b]).size).toBe(0);
  });
  it("resolver elimina todos los choques de aula", () => {
    const { clases, log } = resolverChoques(DATOS_PRUEBA);
    const quedan = [...detectarChoques(clases).values()].flat().filter((c) => c.tipo === "aula");
    expect(quedan.length).toBe(0);
    expect(log.length).toBe(2);
  });
});
