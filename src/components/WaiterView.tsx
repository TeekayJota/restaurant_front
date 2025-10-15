import { useEffect, useMemo, useState } from "react";
import { fetchProducts, createOrder, fetchTables } from "../api";

// --- Tipos de Datos ---
type Item = {
  product_name: string;
  notes: string;
  selected_options: Record<string, unknown>;
};

type Table = { id: number; code: string; is_active: boolean };

type Choice = string | { label: string; value: string };

type Product = {
  id: number;
  name: string;
  description?: string;
  option_schema?: Record<
    string,
    { type: "single" | "multi" | "boolean" | "select"; label: string; choices?: Choice[] }
  >;
};

// --- Función de Ayuda ---
// Normaliza choices para soportar strings u objetos {label,value}
function asChoiceList(input?: unknown): Array<{ value: string; label: string }> {
  if (!Array.isArray(input)) return [];
  return input.map((c: any) =>
    typeof c === "string"
      ? { value: c, label: c }
      : { value: String(c?.value ?? ""), label: String(c?.label ?? c?.value ?? "") }
  );
}

// --- Componente Principal ---
export default function WaiterView() {
  // --- Estados ---
  const [tables, setTables] = useState<Table[]>([]);
  const [tableId, setTableId] = useState<number | null>(null);
  const [juices, setJuices] = useState<Product[]>([]);
  const [sandwiches, setSandwiches] = useState<Product[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sending, setSending] = useState(false);

  // --- Memos y Efectos ---
  const productByName = useMemo(() => {
    const map = new Map<string, Product>();
    [...juices, ...sandwiches].forEach((p) => map.set(p.name, p));
    return map;
  }, [juices, sandwiches]);

  useEffect(() => {
    (async () => {
      const tb = await fetchTables(true);
      setTables(tb);
      if (tb.length > 0) setTableId(tb[0].id);

      const [j, s] = await Promise.all([fetchProducts("JUICE"), fetchProducts("SANDWICH")]);
      setJuices(j);
      setSandwiches(s);
    })();
  }, []);

  // --- Funciones de Lógica ---
  function addItem(name: string) {
    const schema = productByName.get(name)?.option_schema ?? {};
    const initial: Record<string, unknown> = {};
    Object.entries(schema).forEach(([key, def]) => {
      if (def.type === "multi") initial[key] = [];
      else if (def.type === "boolean") initial[key] = false;
      else initial[key] = "";
    });
    setItems((prev) => [...prev, { product_name: name, notes: "", selected_options: initial }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function setOption(idx: number, key: string, value: unknown) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, selected_options: { ...it.selected_options, [key]: value } } : it
      )
    );
  }

  async function submitOrder() {
    if (!tableId || items.length === 0) {
      alert("Selecciona una mesa y agrega al menos un producto.");
      return;
    }
    try {
      setSending(true);
      const payload = { table: tableId, status: "NEW", items };
      const res = await createOrder(payload);
      alert(`✅ Pedido #${res.id} creado`);
      setItems([]);
    } catch (e) {
      alert("Hubo un problema creando el pedido.");
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  // --- Renderizado del Componente ---
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* --- Encabezado --- */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Nuevo Pedido</h1>
        {/* --- Mesa + Enviar --- */}
        <div className="flex items-center gap-3">
          <select
            className="border-slate-300 rounded-md px-3 py-2 min-w-40 shadow-sm
                       focus:ring-2 focus:ring-amber-400 focus:border-amber-400
                       transition-all duration-200"
            value={tableId ?? ""}
            onChange={(e) => setTableId(Number(e.target.value))}
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code}
              </option>
            ))}
          </select>

          <button
            className="px-5 py-2 rounded-lg bg-amber-500 text-white font-semibold shadow-sm 
                       hover:bg-amber-600 hover:shadow-md 
                       focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-75
                       transition-all duration-200
                       disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
            onClick={submitOrder}
            disabled={sending || items.length === 0}
          >
            {sending ? "Enviando..." : "Enviar Pedido"}
          </button>
        </div>
      </div>

      {/* --- Catálogo y Pedido --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- Columna Catálogo --- */}
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-amber-200 pb-2">
              Jugos 🥤
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {juices.map((p) => (
                <button
                  key={p.id}
                  className="bg-white rounded-lg p-3 text-left shadow-md 
                             hover:shadow-xl hover:-translate-y-1 
                             transition-all duration-200"
                  onClick={() => addItem(p.name)}
                  title={p.description || ""}
                >
                  <span className="font-semibold text-slate-700">{p.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-amber-200 pb-2">
              Sandwiches 🥪
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {sandwiches.map((p) => (
                <button
                  key={p.id}
                  className="bg-white rounded-lg p-3 text-left shadow-md 
                             hover:shadow-xl hover:-translate-y-1 
                             transition-all duration-200"
                  onClick={() => addItem(p.name)}
                  title={p.description || ""}
                >
                  <span className="font-semibold text-slate-700">{p.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* --- Columna Ítems Seleccionados --- */}
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-slate-200 pb-2">
            Ítems del Pedido
          </h2>
          {items.length === 0 ? (
            <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                <p className="text-sm text-slate-500">
                    Aún no has agregado productos. <br/>
                    Haz clic en un jugo o sandwich para empezar.
                </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((it, idx) => {
                const schema = productByName.get(it.product_name)?.option_schema ?? {};
                const entries = Object.entries(schema);

                return (
                  <li key={idx} className="bg-white border-l-4 border-amber-400 rounded-r-lg p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg text-slate-800">{it.product_name}</span>
                      <button 
                        className="text-slate-400 hover:text-red-500 transition-colors" 
                        onClick={() => removeItem(idx)}
                        title="Quitar ítem"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    <input
                      className="border-slate-300 rounded-md px-3 py-2 text-sm w-full bg-slate-50
                                 focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition"
                      placeholder="Notas (sin azúcar / sin tomate / etc.)"
                      value={it.notes}
                      onChange={(e) => {
                        const v = e.target.value;
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, notes: v } : x))
                        );
                      }}
                    />

                    {entries.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4 pt-3 border-t mt-3">
                        {entries.map(([key, def]) => {
                          const val = it.selected_options[key];

                          if (def.type === "boolean") {
                            return (
                              <label key={key} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded text-amber-500 focus:ring-amber-400"
                                  checked={Boolean(val)}
                                  onChange={(e) => setOption(idx, key, e.target.checked)}
                                />
                                <span className="text-sm text-slate-600">{def.label}</span>
                              </label>
                            );
                          }

                          if (def.type === "multi") {
                            const arr = Array.isArray(val) ? val : [];
                            const choices = asChoiceList(def.choices);
                            return (
                              <div key={key} className="text-sm">
                                <div className="font-medium text-slate-700 mb-2">{def.label}</div>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  {choices.map((ch) => {
                                    const checked = arr.includes(ch.value);
                                    return (
                                      <label key={`${key}-${ch.value}`} className="inline-flex items-center gap-1.5 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="rounded text-amber-500 focus:ring-amber-400"
                                          checked={checked}
                                          onChange={() => {
                                            const next = checked
                                              ? arr.filter((x) => x !== ch.value)
                                              : [...arr, ch.value];
                                            setOption(idx, key, next);
                                          }}
                                        />
                                        <span className="text-slate-600">{ch.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }

                          const choices = asChoiceList(def.choices);
                          return (
                            <div key={key} className="text-sm">
                              <label className="font-medium text-slate-700 mr-2">{def.label}</label>
                              <select
                                className="border-slate-300 rounded-md px-2 py-1 w-full mt-1
                                           focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition"
                                value={(val as string) || ""}
                                onChange={(e) => setOption(idx, key, e.target.value)}
                              >
                                <option value="">— Seleccionar —</option>
                                {choices.map((ch) => (
                                  <option key={`${key}-${ch.value}`} value={ch.value}>
                                    {ch.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}