export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
export const AULAS = ["Aula 1", "Aula 2", "Aula 3", "Aula 4", "Aula 5", "Lab 1", "Lab 2"];

export type Clase = {
  id: string;
  materia: string;
  seccion: string;
  docente: string;
  aula: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
};

export type Choque = { tipo: "aula" | "docente"; con: string; detalle: string };

export const toMin = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return a * 60 + b;
};

export const seSolapan = (a: Clase, b: Clase) =>
  a.dia === b.dia &&
  toMin(a.hora_inicio) < toMin(b.hora_fin) &&
  toMin(b.hora_inicio) < toMin(a.hora_fin);

export function detectarChoques(clases: Clase[]): Map<string, Choque[]> {
  const res = new Map<string, Choque[]>();
  const add = (id: string, c: Choque) => res.set(id, [...(res.get(id) ?? []), c]);
  for (let i = 0; i < clases.length; i++) {
    for (let j = i + 1; j < clases.length; j++) {
      const a = clases[i], b = clases[j];
      if (!seSolapan(a, b)) continue;
      if (a.aula.trim().toLowerCase() === b.aula.trim().toLowerCase()) {
        add(a.id, { tipo: "aula", con: b.id, detalle: `${a.aula} ocupada por ${b.materia} (${b.seccion})` });
        add(b.id, { tipo: "aula", con: a.id, detalle: `${b.aula} ocupada por ${a.materia} (${a.seccion})` });
      }
      if (a.docente.trim().toLowerCase() === b.docente.trim().toLowerCase()) {
        add(a.id, { tipo: "docente", con: b.id, detalle: `${a.docente} también dicta ${b.materia} (${b.seccion})` });
        add(b.id, { tipo: "docente", con: a.id, detalle: `${b.docente} también dicta ${a.materia} (${a.seccion})` });
      }
    }
  }
  return res;
}

export function aulaLibre(clase: Clase, clases: Clase[], catalogo = AULAS): string | null {
  return (
    catalogo.find((aula) =>
      clases.every((o) => o.id === clase.id || o.aula !== aula || !seSolapan(o, clase)),
    ) ?? null
  );
}

/** Reasigna aulas para eliminar choques de aula. Los choques de docente no se pueden resolver cambiando aula. */
export function resolverChoques(clases: Clase[], catalogo = AULAS) {
  const out = clases.map((c) => ({ ...c }));
  const log: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    const choca = out.some((o, j) => j < i && o.aula === c.aula && seSolapan(o, c));
    if (!choca) continue;
    const libre = aulaLibre(c, out, catalogo);
    if (libre) {
      log.push(`${c.materia} (${c.seccion}) reasignado de ${c.aula} a ${libre}`);
      c.aula = libre;
    } else {
      log.push(`Sin aula libre para ${c.materia} (${c.seccion}) el ${c.dia} ${c.hora_inicio}-${c.hora_fin}`);
    }
  }
  return { clases: out, log };
}

export function toCSV(clases: Clase[]) {
  const cols: (keyof Clase)[] = ["id", "materia", "seccion", "docente", "aula", "dia", "hora_inicio", "hora_fin"];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [cols.join(","), ...clases.map((c) => cols.map((k) => esc(String(c[k]))).join(","))].join("\n");
}

const d = (id: number, materia: string, seccion: string, docente: string, aula: string, dia: string, hi: string, hf: string): Clase => ({
  id: String(id), materia, seccion, docente, aula, dia, hora_inicio: hi, hora_fin: hf,
});

export const DATOS_PRUEBA: Clase[] = [
  d(1, "Cálculo 1", "MI", "Ing. Pérez", "Aula 1", "Lunes", "08:00", "10:00"),
  d(2, "Álgebra Lineal", "MA", "Lic. Gómez", "Aula 1", "Lunes", "09:00", "11:00"), // aula
  d(3, "Física 1", "MI", "Ing. Pérez", "Aula 2", "Lunes", "09:30", "11:30"), // docente
  d(4, "Programación 1", "MB", "Ing. Benítez", "Lab 1", "Martes", "14:00", "16:00"),
  d(5, "Estructuras de Datos", "MA", "Ing. Ríos", "Lab 1", "Martes", "15:00", "17:00"), // aula
  d(6, "Química General", "MI", "Dra. Fernández", "Aula 3", "Miércoles", "07:00", "09:00"),
  d(7, "Dibujo Técnico", "MB", "Arq. Villalba", "Aula 4", "Miércoles", "10:00", "12:00"),
  d(8, "Cálculo 2", "MA", "Lic. Gómez", "Aula 5", "Jueves", "08:00", "10:00"),
  d(9, "Estadística", "MI", "Lic. Gómez", "Aula 2", "Jueves", "09:00", "11:00"), // docente
  d(10, "Inglés Técnico", "MB", "Prof. Duarte", "Aula 3", "Viernes", "18:00", "20:00"),
];
