import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarDays, CheckCircle2, Database, FileJson, FileSpreadsheet,
  List, Plus, Trash2, Zap,
} from "lucide-react";
import {
  AULAS, DATOS_PRUEBA, DIAS, detectarChoques, resolverChoques, toCSV, toMin, type Clase,
} from "@/lib/horarios";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestor de Horarios - FIUNA" },
      { name: "description", content: "Cargá clases, detectá choques de aula o docente y exportá el horario en CSV o JSON." },
      { property: "og:title", content: "Gestor de Horarios - FIUNA" },
      { property: "og:description", content: "Detección y resolución automática de choques de horario para la facultad." },
    ],
  }),
  component: Index,
});

const vacia = { materia: "", seccion: "", docente: "", aula: AULAS[0]!, dia: "Lunes", hora_inicio: "08:00", hora_fin: "10:00" };

function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

function Index() {
  const [clases, setClases] = useState<Clase[]>([]);
  const [form, setForm] = useState(vacia);
  const [vista, setVista] = useState<"tabla" | "calendario">("tabla");
  const [log, setLog] = useState<string[]>([]);
  const [resueltos, setResueltos] = useState<Set<string>>(new Set());

  const choques = useMemo(() => detectarChoques(clases), [clases]);
  const totalConflictos = useMemo(() => {
    const pares = new Set<string>();
    choques.forEach((l, id) => l.forEach((c) => pares.add([id, c.con].sort().join("-") + c.tipo)));
    return pares.size;
  }, [choques]);

  const agregar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.materia || !form.docente) { toast.error("Completá materia y docente"); return; }
    if (toMin(form.hora_fin) <= toMin(form.hora_inicio)) { toast.error("La hora de fin debe ser posterior al inicio"); return; }
    setClases((c) => [...c, { ...form, id: crypto.randomUUID() }]);
    setForm({ ...vacia, dia: form.dia });
    toast.success(`${form.materia} agregada`);
  };

  const resolver = () => {
    const r = resolverChoques(clases);
    const cambiados = new Set(r.clases.filter((c, i) => c.aula !== clases[i]?.aula).map((c) => c.id));
    setClases(r.clases);
    setResueltos(cambiados);
    setTimeout(() => setResueltos(new Set()), 2600);
    if (!r.log.length) { toast.info("No hay choques de aula para resolver"); return; }
    setLog((l) => [...r.log, ...l]);
    r.log.forEach((m) => toast.success(m));
    const restDoc = [...detectarChoques(r.clases).values()].flat().some((c) => c.tipo === "docente");
    if (restDoc) toast.warning("Los choques de docente requieren cambiar horario o docente manualmente");
  };

  return (
    <div className="min-h-screen">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-accent">hack.exe · Reto 07</p>
            <h1 className="font-mono text-2xl font-bold md:text-3xl">Gestor de Horarios - FIUNA</h1>
          </div>
          <div className="flex gap-3">
            <Stat label="Clases" value={clases.length} />
            <Stat label="Conflictos activos" value={totalConflictos} danger={totalConflictos > 0} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => { setClases(DATOS_PRUEBA.map((c) => ({ ...c }))); setLog([]); toast("10 clases de prueba cargadas"); }}>
            <Database className="h-4 w-4" /> Cargar datos de prueba
          </Btn>
          <button onClick={resolver} disabled={!clases.length}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:brightness-95 disabled:opacity-50">
            <Zap className="h-4 w-4" /> Resolver choques automáticamente
          </button>
          <div className="ml-auto flex gap-2">
            <Btn disabled={!clases.length} onClick={() => descargar("horario.csv", toCSV(clases), "text/csv;charset=utf-8")}>
              <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
            </Btn>
            <Btn disabled={!clases.length} onClick={() => descargar("horario.json", JSON.stringify(clases, null, 2), "application/json")}>
              <FileJson className="h-4 w-4" /> Exportar JSON
            </Btn>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-6">
            <form onSubmit={agregar} className="space-y-3 rounded-lg border bg-card p-4">
              <h2 className="font-mono text-sm font-bold uppercase tracking-wide">Nueva clase</h2>
              <Field label="Materia"><input className={inp} value={form.materia} onChange={(e) => setForm({ ...form, materia: e.target.value })} placeholder="Cálculo 1" /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Sección"><input className={inp} value={form.seccion} onChange={(e) => setForm({ ...form, seccion: e.target.value })} placeholder="MI" /></Field>
                <Field label="Aula">
                  <select className={inp} value={form.aula} onChange={(e) => setForm({ ...form, aula: e.target.value })}>{AULAS.map((a) => <option key={a}>{a}</option>)}</select>
                </Field>
              </div>
              <Field label="Docente"><input className={inp} value={form.docente} onChange={(e) => setForm({ ...form, docente: e.target.value })} placeholder="Ing. Pérez" /></Field>
              <Field label="Día">
                <select className={inp} value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })}>{DIAS.map((d) => <option key={d}>{d}</option>)}</select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Inicio"><input type="time" className={inp} value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></Field>
                <Field label="Fin"><input type="time" className={inp} value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} /></Field>
              </div>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                <Plus className="h-4 w-4" /> Agregar clase
              </button>
            </form>

            <div className="rounded-lg border bg-card p-4">
              <h2 className="mb-2 font-mono text-sm font-bold uppercase tracking-wide">Registro de cambios</h2>
              {log.length ? (
                <ul className="space-y-1.5 text-sm">
                  {log.map((m, i) => (
                    <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{m}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">Sin cambios todavía.</p>}
            </div>
          </aside>

          <section className="min-w-0 space-y-3">
            <div className="inline-flex rounded-md border bg-card p-1">
              {([["tabla", "Tabla lista", List], ["calendario", "Calendario semanal", CalendarDays]] as const).map(([k, l, I]) => (
                <button key={k} onClick={() => setVista(k)}
                  className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm transition ${vista === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <I className="h-4 w-4" />{l}
                </button>
              ))}
            </div>

            {!clases.length ? (
              <div className="rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground">
                No hay clases cargadas. Agregá una o cargá los datos de prueba.
              </div>
            ) : vista === "tabla" ? (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>{["Materia", "Sec.", "Docente", "Aula", "Día", "Horario", "Estado", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {clases.map((c) => {
                      const ch = choques.get(c.id);
                      return (
                        <tr key={c.id} className={`border-t transition-colors duration-700 ${ch ? "border-l-4 border-l-destructive bg-danger-soft" : resueltos.has(c.id) ? "flash-ok" : ""}`}>
                          <td className="px-3 py-2 font-medium">{c.materia}</td>
                          <td className="px-3 py-2">{c.seccion}</td>
                          <td className="px-3 py-2">{c.docente}</td>
                          <td className="px-3 py-2">{c.aula}</td>
                          <td className="px-3 py-2">{c.dia}</td>
                          <td className="px-3 py-2 font-mono text-xs">{c.hora_inicio}–{c.hora_fin}</td>
                          <td className="px-3 py-2">
                            {ch ? (
                              <div className="space-y-1">
                                {ch.map((x, i) => (
                                  <span key={i} className="flex items-start gap-1 text-xs font-medium text-destructive">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    Choque de {x.tipo}: {x.detalle}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <button aria-label="Eliminar" onClick={() => setClases((l) => l.filter((x) => x.id !== c.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Calendario clases={clases} choques={choques} />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Calendario({ clases, choques }: { clases: Clase[]; choques: Map<string, unknown[]> }) {
  const ini = Math.min(7 * 60, ...clases.map((c) => toMin(c.hora_inicio)));
  const fin = Math.max(21 * 60, ...clases.map((c) => toMin(c.hora_fin)));
  const startH = Math.floor(ini / 60), endH = Math.ceil(fin / 60);
  const PX = 48;
  const horas = Array.from({ length: endH - startH }, (_, i) => startH + i);
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <div className="grid min-w-[800px]" style={{ gridTemplateColumns: `56px repeat(${DIAS.length}, 1fr)` }}>
        <div />
        {DIAS.map((d) => <div key={d} className="border-b border-l bg-muted px-2 py-2 text-center text-xs font-semibold uppercase">{d}</div>)}
        <div className="relative" style={{ height: horas.length * PX }}>
          {horas.map((h, i) => <div key={h} className="absolute right-2 font-mono text-[10px] text-muted-foreground" style={{ top: i * PX - 6 }}>{String(h).padStart(2, "0")}:00</div>)}
        </div>
        {DIAS.map((d) => {
          const del = clases.filter((c) => c.dia === d);
          return (
            <div key={d} className="relative border-l" style={{ height: horas.length * PX }}>
              {horas.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-dashed" style={{ top: i * PX }} />)}
              {del.map((c) => {
                const solap = del.filter((o) => toMin(o.hora_inicio) < toMin(c.hora_fin) && toMin(c.hora_inicio) < toMin(o.hora_fin));
                const idx = solap.indexOf(c), n = solap.length;
                const bad = choques.has(c.id);
                return (
                  <div key={c.id}
                    className={`absolute overflow-hidden rounded border p-1 text-[11px] leading-tight transition-all duration-500 ${bad ? "border-destructive bg-danger-soft text-destructive" : "border-primary/30 bg-secondary"}`}
                    style={{ top: ((toMin(c.hora_inicio) - startH * 60) / 60) * PX, height: ((toMin(c.hora_fin) - toMin(c.hora_inicio)) / 60) * PX - 2, left: `calc(${(idx / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}>
                    <div className="flex items-center gap-1 font-semibold">{bad && <AlertTriangle className="h-3 w-3 shrink-0" />}{c.materia}</div>
                    <div>{c.aula} · {c.docente}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function Btn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:opacity-50" />;
}

function Stat({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className={`rounded-md border px-4 py-2 text-right transition-colors ${danger ? "border-destructive bg-destructive text-destructive-foreground" : "border-primary-foreground/20"}`}>
      <div className="font-mono text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}
