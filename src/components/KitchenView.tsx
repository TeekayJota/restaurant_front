// src/components/KitchenView.tsx
import { useState, useEffect } from "react";
import { fetchOrders, updateOrderStatus } from "../api";

// --- Tipos de Datos ---
type OrderItem = {
  id: number;
  product_name: string;
  notes: string;
  selected_options: Record<string, unknown>;
};

type Order = {
  id: number;
  table_code: string;
  status: "NEW" | "PREPARING" | "READY";
  status_display: string;
  created_at: string;
  items: OrderItem[];
};

// --- Componente de la Vista de Cocina ---
export default function KitchenView() {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = async () => {
    try {
      const fetchedOrders = await fetchOrders();
      const activeOrders = fetchedOrders.filter(o => ['NEW', 'PREPARING'].includes(o.status));
      setOrders(activeOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  useEffect(() => {
    loadOrders();
    const intervalId = setInterval(loadOrders, 7000);
    return () => clearInterval(intervalId);
  }, []);

  const handleStatusChange = async (orderId: number, newStatus: "PREPARING" | "READY") => {
    try {
      await updateOrderStatus(orderId, newStatus);
      loadOrders();
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const newOrders = orders.filter((o) => o.status === "NEW");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");

  return (
    <div className="p-4"> {/* ✅ CAMBIO REALIZADO AQUÍ */}
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Panel de Cocina</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Columna: Nuevos Pedidos */}
        <section>
          <h2 className="text-xl font-bold text-blue-600 mb-4">Nuevos ({newOrders.length})</h2>
          <div className="space-y-4">
            {newOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Mesa {order.table_code}</h3>
                    <span className="text-sm text-slate-500">Pedido #{order.id}</span>
                </div>
                
                <div className="border-t space-y-2 pt-3 mt-3">
                  {order.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="p-2 bg-slate-50 rounded-md border border-slate-200">
                      <p className="font-semibold text-slate-800">{item.product_name}</p>
                      
                      {item.notes && (
                        <p className="text-sm text-amber-800 italic pl-2">↳ Nota: {item.notes}</p>
                      )}

                      <ul className="pl-5 text-sm text-slate-600 list-disc">
                        {Object.entries(item.selected_options)
                          .filter(([_, value]) => value && value !== "" && (!Array.isArray(value) || value.length > 0))
                          .map(([key, value]) => (
                            <li key={key}>
                              <span className="capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                              <strong>{Array.isArray(value) ? value.join(", ") : String(value)}</strong>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleStatusChange(order.id, "PREPARING")}
                  className="w-full mt-4 px-4 py-2 rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600 transition">
                  Empezar Preparación
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Columna: En Preparación */}
        <section>
          <h2 className="text-xl font-bold text-amber-600 mb-4">En Preparación ({preparingOrders.length})</h2>
          <div className="space-y-4">
            {preparingOrders.map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold">Mesa {order.table_code}</h3>
                    <span className="text-sm text-slate-500">Pedido #{order.id}</span>
                </div>
                
                <div className="border-t space-y-2 pt-3 mt-3">
                  {order.items.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="p-2 bg-slate-50 rounded-md border border-slate-200">
                      <p className="font-semibold text-slate-800">{item.product_name}</p>
                      
                      {item.notes && (
                        <p className="text-sm text-amber-800 italic pl-2">↳ Nota: {item.notes}</p>
                      )}

                      <ul className="pl-5 text-sm text-slate-600 list-disc">
                        {Object.entries(item.selected_options)
                          .filter(([_, value]) => value && value !== "" && (!Array.isArray(value) || value.length > 0))
                          .map(([key, value]) => (
                            <li key={key}>
                              <span className="capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                              <strong>{Array.isArray(value) ? value.join(", ") : String(value)}</strong>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleStatusChange(order.id, "READY")}
                  className="w-full mt-4 px-4 py-2 rounded-md bg-green-500 text-white font-semibold hover:bg-green-600 transition">
                  Marcar como Listo
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}