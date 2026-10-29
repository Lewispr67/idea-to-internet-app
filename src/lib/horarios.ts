export const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;
export const DIAS_HABILES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
export const AULAS = ["A", "B", "C", "D", "E", "F"].flatMap((l) => [1, 2, 3].map((n) => `${l}${n}`));
export const HORA_MIN = 7 * 60;
export const HORA_MAX = 22 * 60;

export type Clase = {
  id: string; materia: string; seccion: string; docente: string; aula: string;
  dia: string; hora_inicio: string; hora_fin: string;
};
export type Choque = { tipo: "aula" | "docente"; con: string; detalle: string };

export const toMin = (h: string) => { const [a = 0, b = 0] = h.split(":").map(Number); return a * 60 + b; };
export const toHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const norm = (s: string) => s.trim().toLowerCase();

export const seSolapan = (a: Clase, b: Clase) =>
  a.dia === b.dia && toMin(a.hora_inicio) < toMin(b.hora_fin) && toMin(b.hora_inicio) < toMin(a.hora_fin);

export function detectarChoques(clases: Clase[]): Map<string, Choque[]> {
  const res = new Map<string, Choque[]>();
  const add = (id: string, c: Choque) => res.set(id, [...(res.get(id) ?? []), c]);
  for (let i = 0; i < clases.length; i++) for (let j = i + 1; j < clases.length; j++) {
    const a = clases[i]!, b = clases[j]!;
    if (!seSolapan(a, b)) continue;
    if (norm(a.aula) === norm(b.aula)) {
      add(a.id, { tipo: "aula", con: b.id, detalle: `${a.aula} ocupada por ${b.materia} (${b.seccion})` });
      add(b.id, { tipo: "aula", con: a.id, detalle: `${b.aula} ocupada por ${a.materia} (${a.seccion})` });
    }
    if (norm(a.docente) === norm(b.docente)) {
      add(a.id, { tipo: "docente", con: b.id, detalle: `${a.docente} también dicta ${b.materia} (${b.seccion})` });
      add(b.id, { tipo: "docente", con: a.id, detalle: `${b.docente} también dicta ${a.materia} (${a.seccion})` });
    }
  }
  return res;
}

/** ¿La clase c puede ubicarse sin chocar con "otras" (aula y docente)? */
export const esValida = (c: Clase, otras: Clase[]) =>
  otras.every((o) => o.id === c.id || !seSolapan(o, c) || (norm(o.aula) !== norm(c.aula) && norm(o.docente) !== norm(c.docente)));

const docenteLibre = (c: Clase, otras: Clase[]) =>
  otras.every((o) => o.id === c.id || !seSolapan(o, c) || norm(o.docente) !== norm(c.docente));

/** Busca aula libre en el día/horario de c (aulas en orden, prefiriendo la actual). */
function buscarAula(c: Clase, otras: Clase[], catalogo: string[]): string | null {
  if (!docenteLibre(c, otras)) return null;
  for (const aula of [c.aula, ...catalogo.filter((a) => a !== c.aula)])
    if (esValida({ ...c, aula }, otras)) return aula;
  return null;
}

/** Busca un horario en el día dado (desplazando de a 1 hora, primero más tarde y luego más temprano). */
function buscarHorario(c: Clase, dia: string, otras: Clase[], catalogo: string[]) {
  const ini = toMin(c.hora_inicio), dur = toMin(c.hora_fin) - ini;
  const shifts: number[] = [];
  for (let k = 1; k <= 15; k++) shifts.push(k * 60, -k * 60);
  const cands = (dia === c.dia ? shifts : [0, ...shifts]).map((s) => ini + s)
    .filter((s) => s >= HORA_MIN && s + dur <= HORA_MAX);
  for (const s of cands) {
    const prueba = { ...c, dia, hora_inicio: toHora(s), hora_fin: toHora(s + dur) };
    const aula = buscarAula(prueba, otras, catalogo);
    if (aula) return { ...prueba, aula };
  }
  return null;
}

export type Pendiente = { id: string; materia: string; dia: string };

/** Cascada: 1) cambiar aula, 2) cambiar horario mismo día, 3) cambiar día (L-V), 4) pendiente para el usuario. */
export function resolverChoques(clases: Clase[], catalogo = AULAS) {
  const out = clases.map((c) => ({ ...c }));
  const log: string[] = [];
  const pendientes: Pendiente[] = [];
  const cambiados = new Set<string>();
  for (let i = 0; i < out.length; i++) {
    const c = out[i]!;
    const previas = out.slice(0, i);
    if (esValida(c, previas)) continue;
    const otras = out.filter((o) => o.id !== c.id);
    const etiqueta = `${c.materia} (${c.seccion})`;
    // P1: aula
    const aula = buscarAula(c, otras, catalogo);
    if (aula) {
      log.push(`${etiqueta}: aula cambiada de ${c.aula} a ${aula}`);
      c.aula = aula; cambiados.add(c.id); continue;
    }
    // P2: horario mismo día
    const h = buscarHorario(c, c.dia, otras, catalogo);
    if (h) {
      log.push(`${etiqueta}: horario movido de ${c.hora_inicio}-${c.hora_fin} a ${h.hora_inicio}-${h.hora_fin} (${h.aula})`);
      Object.assign(c, h); cambiados.add(c.id); continue;
    }
    // P3: otro día
    let movido = false;
    for (const dia of DIAS_HABILES.filter((d) => d !== c.dia)) {
      const r = buscarHorario(c, dia, otras, catalogo);
      if (r) {
        log.push(`${etiqueta}: movida de ${c.dia} a ${dia} ${r.hora_inicio}-${r.hora_fin} (${r.aula})`);
        Object.assign(c, r); cambiados.add(c.id); movido = true; break;
      }
    }
    if (!movido) pendientes.push({ id: c.id, materia: c.materia, dia: c.dia });
  }
  return { clases: out, log, pendientes, cambiados };
}

/** Mueve una clase al día elegido por el usuario, buscando aula/horario allí si es posible. */
export function moverADia(clases: Clase[], id: string, dia: string, catalogo = AULAS) {
  const c = clases.find((x) => x.id === id);
  if (!c) return { clases, ok: false };
  const otras = clases.filter((x) => x.id !== id);
  const r = buscarHorario(c, dia, otras, catalogo);
  const nueva = r ?? { ...c, dia };
  return { clases: clases.map((x) => (x.id === id ? nueva : x)), ok: !!r, clase: nueva };
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
  d(1, "Cálculo 1", "A", "Ing. Pérez", "A1", "Lunes", "08:00", "10:00"),
  d(2, "Álgebra Lineal", "A", "Lic. Gómez", "A1", "Lunes", "09:00", "11:00"), // aula
  d(3, "Física 1", "A", "Ing. Pérez", "A2", "Lunes", "09:30", "11:30"), // docente
  d(4, "Programación 1", "B", "Ing. Benítez", "C1", "Martes", "14:00", "16:00"),
  d(5, "Estructuras de Datos", "A", "Ing. Ríos", "C1", "Martes", "15:00", "17:00"), // aula
  d(6, "Química General", "A", "Dra. Fernández", "B3", "Miércoles", "07:00", "09:00"),
  d(7, "Dibujo Técnico", "B", "Arq. Villalba", "D2", "Miércoles", "10:00", "12:00"),
  d(8, "Cálculo 2", "A", "Lic. Gómez", "E1", "Jueves", "08:00", "10:00"),
  d(9, "Estadística", "A", "Lic. Gómez", "B2", "Jueves", "09:00", "11:00"), // docente
  d(10, "Inglés Técnico", "B", "Prof. Duarte", "F3", "Viernes", "18:00", "20:00"),
  d(11, "Cálculo 1", "B", "Lic. Martínez", "A3", "Martes", "08:00", "10:00"),
  d(12, "Dibujo Técnico", "A", "Arq. Villalba", "D1", "Jueves", "14:00", "16:00"),
];
