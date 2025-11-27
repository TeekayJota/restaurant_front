// src/components/EditOrderPage.tsx
// CORREGIDO: Se usa 'useRef' para 'previousStatus' y 'didSave' para romper el bucle infinito.

import { useEffect, useMemo, useState, useRef } from "react"; // <-- 1. IMPORTAR useRef
import { Link, useNavigate, useParams, Navigate } from "react-router-dom";
import {
  fetchProducts,
  fetchOrderDetails,
  updateOrder,
  updateOrderStatus
} from "../api";
import type { Item, Product, Order } from "../types";
import AlertModal from "./AlertModal";

// --- Función de Ayuda (sin cambios) ---
function asChoiceList(input?: unknown): Array<{ value: string; label: string }> {
  if (!Array.isArray(input)) return [];
  return input.map((c: any) =>
    typeof c === "string"
      ? { value: c, label: c }
      : { value: String(c?.value ?? ""), label: String(c?.label ?? c?.value ?? "") }
  );
}

// --- Componente Principal ---
export default function EditOrderPage() {
  const [originalOrder, setOriginalOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [juices, setJuices] = useState<Product[]>([]);
  const [sandwiches, setSandwiches] = useState<Product[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [sending, setSending] = useState(false);
  
  // --- 2. CAMBIAR 'useState' POR 'useRef' ---
  // Usamos useRef para guardar los estados que no deben causar un re-render
  const previousStatusRef = useRef<string>('NEW');
  const didSaveRef = useRef(false);
  
  const navigate = useNavigate();
  const { orderId } = useParams();
  
  // Estado para alertas (sin cambios)
  const [alertInfo, setAlertInfo] = useState<{ 
        isOpen: boolean; 
        title: string; 
        message: string;
        onClose?: () => void;
    }>({ isOpen: false, title: "", message: "" });
  const handleCloseAlert = () => {
        if (alertInfo.onClose) {
            alertInfo.onClose();
        }
        setAlertInfo({ isOpen: false, title: "", message: "" });
    };

  // --- Memos (sin cambios) ---
  const productByName = useMemo(() => {
    const map = new Map<string, Product>();
    [...juices, ...sandwiches].forEach((p) => map.set(p.name, p));
    return map;
  }, [juices, sandwiches]);

  // --- LÓGICA DE CARGA Y LIMPIEZA (CORREGIDA) ---
  useEffect(() => {
    if (!orderId) {
      setError("No se proporcionó un ID de pedido.");
      setIsLoading(false);
      return;
    }
    
    let isMounted = true;
    
    const loadAllData = async () => {
      try {
        setIsLoading(true);
        const [j, s] = await Promise.all([fetchProducts("JUICE"), fetchProducts("SANDWICH")]);
        if (!isMounted) return;
        setJuices(j);
        setSandwiches(s);

        const order = await fetchOrderDetails(Number(orderId));
        if (!isMounted) return;

        setOriginalOrder(order);
        
        // --- 3. GUARDAMOS EL ESTADO EN LA REF (NO EN EL ESTADO) ---
        previousStatusRef.current = order.status; 
        
        setItems(order.items.map(it => ({
          product_name: it.product_name,
          notes: it.notes ?? "",
          selected_options: it.selected_options
        })));
        
        if (order.status === "NEW" || order.status === "PREPARING") {
          await updateOrderStatus(order.id, "WAITER_EDITING");
        }
        
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err.message : "Error cargando datos.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    loadAllData();
    
    // --- FUNCIÓN DE LIMPIEZA (usa Refs) ---
    return () => {
        isMounted = false;
        
        const orderIdNum = Number(orderId);
        const prevStatus = previousStatusRef.current; // Lee el valor actual de la ref

        // Si el mesero abandona SIN GUARDAR
        if (!didSaveRef.current && orderIdNum && (prevStatus === 'NEW' || prevStatus === 'PREPARING')) {
            
            console.log("Desbloqueando pedido, volviendo a estado:", prevStatus);
            updateOrderStatus(orderIdNum, prevStatus as "NEW" | "PREPARING")
                .catch(err => console.error("Error revirtiendo el estado:", err));
        }
    };

  }, [orderId]); // <-- 4. EL ARRAY DE DEPENDENCIAS AHORA ES ESTABLE

  
  // --- Funciones de Lógica (sin cambios) ---
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

  // --- LÓGICA DE GUARDADO (usa Refs) ---
  async function submitChanges() {
    if (!originalOrder || items.length === 0) {
        setAlertInfo({ isOpen: true, title: "Error", message: "No se pueden guardar cambios sin ítems." });
        return;
    }
    
    try {
        setSending(true);
        let successMessage: string;
        
        const payload = {
            items: items,
            // --- 5. LEE EL ESTADO PREVIO DESDE LA REF ---
            previous_status_on_edit: previousStatusRef.current
        };
        
        await updateOrder(originalOrder.id, payload);
        
        // --- 6. MARCA EL GUARDADO EN LA REF ---
        didSaveRef.current = true;

        if (previousStatusRef.current === "PREPARING") {
            successMessage = "✅ Cambios solicitados. Cocina debe aprobar."; 
        } else {
            successMessage = "✅ Pedido actualizado correctamente.";
        }
        
        setAlertInfo({ 
            isOpen: true, 
            title: "¡Éxito!", 
            message: successMessage, 
            onClose: () => navigate("/waiter") 
        });
        
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Hubo un problema guardando los cambios.";
        setAlertInfo({ isOpen: true, title: "Error", message: msg });
        console.error(e);
    } finally {
        setSending(false);
    }
  }

  // --- JSX (usa Ref) ---
  if (isLoading) {
    return <div className="p-4 text-center">Cargando datos del pedido...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  
  if (!originalOrder) {
    return <Navigate to="/waiter" replace />;
  }

  return (
    <>
      <div className="max-w-6xl mx-auto p-4 space-y-8">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/waiter" 
              className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold shadow-sm 
                         hover:bg-slate-300 transition-all duration-200"
            >
              &larr; Volver
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">
              Editar Pedido #{originalOrder.id}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="px-3 py-2 border border-slate-300 rounded-md bg-slate-100 text-slate-600 font-medium">
              Mesa: {originalOrder.table_code}
            </span>
            
            <button
              className="px-5 py-2 rounded-lg bg-amber-500 text-white font-semibold shadow-sm 
                         hover:bg-amber-600 hover:shadow-md 
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-75
                         transition-all duration-200
                         disabled:bg-slate-300"
              onClick={submitChanges}
              disabled={sending || items.length === 0}
            >
              {/* 7. LEE EL ESTADO PREVIO DESDE LA REF PARA EL TEXTO DEL BOTÓN */}
              {sending ? "Guardando..." : (previousStatusRef.current === "PREPARING" ? "Solicitar Cambio" : "Guardar Cambios")}
            </button>
          </div>
        </div>

        {/* Catálogo y Pedido (sin cambios) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Catálogo */}
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
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">{p.name}</span>
                      <span className="font-mono text-sm text-slate-500">S/ {p.base_price}</span>
                    </div>
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
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-700">{p.name}</span>
                      <span className="font-mono text-sm text-slate-500">S/ {p.base_price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Columna Ítems Seleccionados */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b-2 border-slate-200 pb-2">
              Ítems del Pedido
            </h2>
            {items.length === 0 ? (
              <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
                  <p className="text-sm text-slate-500">
                      Aún no has agregado productos.
                  </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {items.map((it, idx) => {
                  const schema = productByName.get(it.product_name)?.option_schema ?? {};
                  const entries = Object.entries(schema);
                  const product = productByName.get(it.product_name);

                  return (
                    <li key={idx} className="bg-white border-l-4 border-amber-400 rounded-r-lg p-4 space-y-3 shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg text-slate-800">{it.product_name}</span>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-lg text-slate-700">S/ {product?.base_price}</span>
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
      
      {/* MODAL DE ALERTA */}
      <AlertModal
        isOpen={alertInfo.isOpen}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={handleCloseAlert}
        />
    </>
  );
}