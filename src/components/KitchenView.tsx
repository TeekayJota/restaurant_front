// src/components/KitchenView.tsx

import { useState, useEffect } from "react";
import { fetchOrders } from "../api";
import type { Order } from "../types";
import OrderCardKitchen from "./OrderCardKitchen";
import ChangeRequestModal from "./ChangeRequestModal"; 

// --- Componente de la Vista de Cocina ---
export default function KitchenView() {
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [selectedOrderForChange, setSelectedOrderForChange] = useState<Order | null>(null);
  
  const loadOrders = async () => {
    try {
      const activeStatuses = ["NEW", "WAITER_EDITING", "PREPARING", "CHANGE_REQUESTED"];
      const fetchedOrders = await fetchOrders(activeStatuses);
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  // useEffect con WebSocket
  useEffect(() => {
    loadOrders();
    
    // --- CORRECCIÓN DE ESTABILIDAD: Usar 127.0.0.1 ---
    const wsUrl = "ws://127.0.0.1:8000/ws/kitchen/";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("WebSocket: Conectado a la cocina.");
    socket.onclose = () => console.warn("WebSocket: Desconectado de la cocina.");
    socket.onerror = (error) => console.error("WebSocket (Cocina): Error:", error);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { type, order } = data as { type: string, order: Order };

      if (type === "NEW_ORDER" || type === "STATUS_UPDATE") {
        
        if (order.status === "READY" || order.status === "PAID") {
            setOrders((prev) => prev.filter((o) => o.id !== order.id));
        } else {
            setOrders((prev) => {
                const existing = prev.find(o => o.id === order.id);
                if (existing) {
                    return prev.map((o) => (o.id === order.id ? order : o));
                } else if (type === "NEW_ORDER") {
                    return [order, ...prev];
                }
                return prev;
            });
        }
      }
    };

    return () => socket.close();
  }, []); 
  
  const handleOpenChangeModal = (order: Order) => {
      setSelectedOrderForChange(order);
  };
  
  const newOrders = orders.filter((o) => o.status === "NEW" || o.status === "WAITER_EDITING");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING" || o.status === "CHANGE_REQUESTED");
  
  const changeRequestedCount = preparingOrders.filter(o => o.status === "CHANGE_REQUESTED").length;
  const editingCount = newOrders.filter(o => o.status === "WAITER_EDITING").length;

  return (
    <>
      <div className="p-4">
        {/* --- AÑADIDO: Alerta General (para eliminar el warning de TS) --- */}
        {(changeRequestedCount > 0 || editingCount > 0) && (
          <div className="bg-red-500 text-white p-3 rounded-lg text-center mb-6 font-semibold animate-pulse">
              ¡ATENCIÓN! Hay {changeRequestedCount > 0 && `${changeRequestedCount} SOLICITUD DE CAMBIO `}
              {editingCount > 0 && `${editingCount} PEDIDO(S) EN EDICIÓN `}
              PENDIENTE(S).
          </div>
        )}
        {/* ... (Encabezado y Alerta General sin cambios) ... */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          
          {/* Columna: Nuevos Pedidos */}
          <section>
            <h2 className="text-xl font-bold text-blue-600 mb-4">Nuevos ({newOrders.length})</h2>
            <div className="space-y-4">
              {newOrders
                  .sort((a, b) => a.status.localeCompare(b.status)) 
                  .map((order) => (
                      <OrderCardKitchen 
                        key={order.id} 
                        order={order} 
                        onOpenChangeModal={handleOpenChangeModal}
                      />
              ))}
            </div>
          </section>

          {/* Columna: En Preparación */}
          <section>
            <h2 className="text-xl font-bold text-amber-600 mb-4">En Preparación ({preparingOrders.length})</h2>
            <div className="space-y-4">
              {preparingOrders
                  .sort((a, b) => a.status.localeCompare(b.status)) 
                  .map((order) => (
                      <OrderCardKitchen 
                        key={order.id} 
                        order={order} 
                        onOpenChangeModal={handleOpenChangeModal}
                      />
              ))}
            </div>
          </section>
        </div>
      </div>
      
      {/* RENDERIZAR EL MODAL DE CAMBIOS */}
      <ChangeRequestModal
        isOpen={selectedOrderForChange !== null}
        onClose={() => setSelectedOrderForChange(null)}
        order={selectedOrderForChange}
        onStatusUpdated={loadOrders}
      />
    </>
  );
}