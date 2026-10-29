import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarDays, CheckCircle2, Database, FileJson, FileSpreadsheet,
  GraduationCap, List, Pencil, Plus, Trash2, UserCog, Users, X, Zap,
} from "lucide-react";
import {
  AULAS, DATOS_PRUEBA, DIAS, detectarChoques, moverADia, resolverChoques, type Pendiente, toCSV, toMin, type Clase,
} from "@/lib/horarios";
import logo from "@/assets/logo-fiuna.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sistema de Gestión de Horarios - FIUNA" },
      { name: "description", content: "Cargá clases, detectá choques de aula o docente y exportá el horario en CSV o JSON." },
      { property: "og:title", content: "Sistema de Gestión de Horarios - FIUNA" },
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

type Rol = "profesor" | "alumno" | null;
const claveMS = (c: { materia: string; seccion: string }) => `${c.materia}|||${c.seccion}`;

function Index() {
  const [rol, setRol] = useState<Rol>(null);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [eligiendo, setEligiendo] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [clases, setClases] = useState<Clase[]>(() => DATOS_PRUEBA.map((c) => ({ ...c })));
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
    if (editId) {
      setClases((l) => l.map((c) => (c.id === editId ? { ...form, id: editId } : c)));
      setEditId(null);
      toast.success(`${form.materia} actualizada`);
    } else {
      setClases((c) => [...c, { ...form, id: crypto.randomUUID() }]);
      toast.success(`${form.materia} agregada`);
    }
    setForm({ ...vacia, dia: form.dia });
  };

  const resolver = () => {
    const r = resolverChoques(clases);
    setClases(r.clases);
    setResueltos(r.cambiados);
    setTimeout(() => setResueltos(new Set()), 2600);
    setPendientes(r.pendientes);
    if (!r.log.length && !r.pendientes.length) { toast.info("No hay choques para resolver"); return; }
    setLog((l) => [...r.log, ...l]);
    r.log.forEach((m) => toast.success(m));
  };

  const elegirDia = (dia: string) => {
    const p = pendientes[0];
    if (!p) return;
    const m = moverADia(clases, p.id, dia);
    setClases(m.clases);
    const msg = `${p.materia}: movida manualmente de ${p.dia} a ${dia}${m.clase ? ` ${m.clase.hora_inicio}-${m.clase.hora_fin} (${m.clase.aula})` : ""}`;
    setLog((l) => [msg, ...l]);
    if (m.ok) { toast.success(msg); setResueltos(new Set([p.id])); setTimeout(() => setResueltos(new Set()), 2600); }
    else toast.warning(`${p.materia} sigue con choque en ${dia}`);
    setPendientes((l) => l.slice(1));
  };

  const editar = (c: Clase) => {
    setEditId(c.id);
    setForm({ materia: c.materia, seccion: c.seccion, docente: c.docente, aula: c.aula, dia: c.dia, hora_inicio: c.hora_inicio, hora_fin: c.hora_fin });
  };

  const opciones = useMemo(
    () => [...new Map(clases.map((c) => [claveMS(c), c])).values()].sort((a, b) => claveMS(a).localeCompare(claveMS(b))),
    [clases],
  );
  const esProf = rol === "profesor";
  const visibles = esProf ? clases : clases.filter((c) => seleccion.has(claveMS(c)));

  if (!rol) return <SelectorRol onElegir={(r) => { setRol(r); if (r === "alumno") setEligiendo(true); }} />;
  if (rol === "alumno" && eligiendo)
    return <SelectorMaterias opciones={opciones} seleccion={seleccion} setSeleccion={setSeleccion}
      onListo={() => setEligiendo(false)} onVolver={() => setRol(null)} />;

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-primary bg-secondary-foreground text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <img src={logo.url} alt="Logo FIUNA" className="h-14 w-14 rounded-md object-cover" />
            <h1 className="font-mono text-xl font-bold md:text-2xl">Sistema de Gestión de Horarios - FIUNA</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold">
              {esProf ? <UserCog className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
              {esProf ? "Profesor / Coordinación" : "Alumno · solo consulta"}
            </span>
            {!esProf && (
              <button onClick={() => setEligiendo(true)} className="rounded-md border border-primary-foreground/30 px-3 py-1.5 text-xs font-medium hover:bg-primary-foreground/10">Modificar materias</button>
            )}
            <button onClick={() => { setRol(null); setEditId(null); }} className="inline-flex items-center gap-1.5 rounded-md border border-primary-foreground/30 px-3 py-1.5 text-xs font-medium hover:bg-primary-foreground/10">
              <Users className="h-3.5 w-3.5" /> Cambiar de rol
            </button>
            <Stat label="Clases" value={visibles.length} />
            {esProf && <Stat label="Conflictos activos" value={totalConflictos} danger={totalConflictos > 0} />}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="flex flex-wrap gap-2">
          {esProf && <>
          <Btn onClick={() => { setClases(DATOS_PRUEBA.map((c) => ({ ...c }))); setLog([]); toast(`${DATOS_PRUEBA.length} clases de prueba cargadas`); }}>
            <Database className="h-4 w-4" /> Cargar datos de prueba
          </Btn>
          <button onClick={resolver} disabled={!clases.length}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:brightness-95 disabled:opacity-50">
            <Zap className="h-4 w-4" /> Resolver choques automáticamente
          </button>
          </>}
          <div className="ml-auto flex gap-2">
            <Btn disabled={!clases.length} onClick={() => descargar("horario.csv", toCSV(visibles), "text/csv;charset=utf-8")}>
              <FileSpreadsheet className="h-4 w-4" /> Exportar CSV
            </Btn>
            <Btn disabled={!clases.length} onClick={() => descargar("horario.json", JSON.stringify(visibles, null, 2), "application/json")}>
              <FileJson className="h-4 w-4" /> Exportar JSON
            </Btn>
          </div>
        </div>

        <div className={`grid gap-6 ${esProf ? "lg:grid-cols-[300px_1fr]" : ""}`}>
          {esProf && <aside className="space-y-6">
            <form onSubmit={agregar} className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-sm font-bold uppercase tracking-wide">{editId ? "Editar clase" : "Nueva clase"}</h2>
                {editId && <button type="button" onClick={() => { setEditId(null); setForm(vacia); }} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>}
              </div>
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
                {editId ? <><Pencil className="h-4 w-4" /> Guardar cambios</> : <><Plus className="h-4 w-4" /> Agregar clase</>}
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
          </aside>}

          <section className="min-w-0 space-y-3">
            <div className="inline-flex rounded-md border bg-card p-1">
              {([["tabla", "Tabla lista", List], ["calendario", "Calendario semanal", CalendarDays]] as const).map(([k, l, I]) => (
                <button key={k} onClick={() => setVista(k)}
                  className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm transition ${vista === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <I className="h-4 w-4" />{l}
                </button>
              ))}
            </div>

            {!visibles.length ? (
              <div className="rounded-lg border border-dashed bg-card p-12 text-center text-muted-foreground">
                {esProf ? "No hay clases cargadas. Agregá una o cargá los datos de prueba." : "No seleccionaste materias. Tocá «Modificar materias»."}
              </div>
            ) : vista === "tabla" ? (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>{(esProf ? ["Materia", "Sec.", "Docente", "Aula", "Día", "Horario", "Estado", ""] : ["Materia", "Sec.", "Docente", "Aula", "Día", "Horario", "Estado"]).map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {visibles.map((c) => {
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
                          {esProf && <td className="whitespace-nowrap px-3 py-2">
                            <button aria-label="Editar" onClick={() => editar(c)} className="mr-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                            <button aria-label="Eliminar" onClick={() => setClases((l) => l.filter((x) => x.id !== c.id))} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                          </td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Calendario clases={visibles} choques={choques} />
            )}
          </section>
        </div>
      </main>
      {esProf && pendientes[0] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <p className="text-sm">No fue posible asignar un aula ni un horario automáticamente en <b>{pendientes[0].dia}</b>. ¿A qué día deseas mover la clase de <b>{pendientes[0].materia}</b>?</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DIAS.filter((d) => d !== pendientes[0]!.dia).map((d) => (
                <button key={d} onClick={() => elegirDia(d)} className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-primary hover:text-primary-foreground">{d}</button>
              ))}
            </div>
            <button onClick={() => setPendientes((l) => l.slice(1))} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /> Dejar como está</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectorRol({ onElegir }: { onElegir: (r: "profesor" | "alumno") => void }) {
  const [pidiendo, setPidiendo] = useState(false);
  const [clave, setClave] = useState("");
  const [error, setError] = useState(false);
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary-foreground p-6">
      <div className="w-full max-w-lg space-y-6 text-center text-primary-foreground">
        <div>
          <img src={logo.url} alt="Logo FIUNA" className="mx-auto mb-4 h-24 w-24 rounded-lg object-cover" />
          <p className="font-mono text-xs uppercase tracking-widest text-primary-foreground/70">Sistema de Gestión de Horarios - FIUNA</p>
          <h1 className="mt-2 font-mono text-3xl font-bold">¿Cómo deseas ingresar?</h1>
        </div>
        {pidiendo ? (
          <form onSubmit={(e) => { e.preventDefault(); if (clave === "12345") onElegir("profesor"); else setError(true); }}
            className="space-y-3 rounded-lg border-t-4 border-primary bg-card p-6 text-left text-card-foreground">
            <label className="block text-sm font-semibold">Contraseña de Profesor / Coordinación</label>
            <input type="password" autoFocus value={clave} onChange={(e) => { setClave(e.target.value); setError(false); }}
              className="w-full rounded-md border px-3 py-2" />
            {error && <p className="text-sm text-destructive">Contraseña incorrecta</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => { setPidiendo(false); setClave(""); setError(false); }} className="flex-1 rounded-md border px-3 py-2 text-sm">Volver</button>
              <button type="submit" className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Ingresar</button>
            </div>
          </form>
        ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {([["profesor", "Profesor / Coordinación", "Acceso con contraseña: crea, edita y resuelve choques", UserCog],
             ["alumno", "Alumno", "Acceso libre: consulta de tus materias", GraduationCap]] as const).map(([k, t, d, I]) => (
            <button key={k} onClick={() => (k === "profesor" ? setPidiendo(true) : onElegir(k))} className="space-y-2 rounded-lg border-t-4 border-primary bg-card p-6 text-card-foreground transition hover:-translate-y-0.5 hover:shadow-lg">
              <I className="mx-auto h-8 w-8 text-primary" />
              <div className="font-mono font-bold uppercase">{t}</div>
              <div className="text-xs text-muted-foreground">{d}</div>
            </button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

function SelectorMaterias({ opciones, seleccion, setSeleccion, onListo, onVolver }: {
  opciones: Clase[]; seleccion: Set<string>; setSeleccion: (s: Set<string>) => void; onListo: () => void; onVolver: () => void;
}) {
  const toggle = (k: string) => { const n = new Set(seleccion); n.has(k) ? n.delete(k) : n.add(k); setSeleccion(n); };
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-6">
      <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6">
        <h1 className="font-mono text-xl font-bold">Elegí tus materias y secciones</h1>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto">
          {opciones.map((o) => {
            const k = claveMS(o);
            return (
              <label key={k} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
                <input type="checkbox" checked={seleccion.has(k)} onChange={() => toggle(k)} className="h-4 w-4 accent-primary" />
                <span className="text-sm">{o.materia} - Sección {o.seccion}</span>
              </label>
            );
          })}
          {!opciones.length && <p className="text-sm text-muted-foreground">Todavía no hay clases cargadas.</p>}
        </div>
        <div className="flex justify-between">
          <button onClick={onVolver} className="text-sm text-muted-foreground hover:text-foreground">← Volver</button>
          <button onClick={onListo} disabled={!seleccion.size} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Ver mi horario ({seleccion.size})</button>
        </div>
      </div>
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
