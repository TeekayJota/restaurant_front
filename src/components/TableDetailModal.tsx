// src/components/TableDetailModal.tsx
// Esta es la ventana emergente (modal) que muestra el detalle de una mesa.

import { useState } from "react";
import { Link } from "react-router-dom";
import type { Table, Order } from "../types";
import OrderRow from "./OrderRow";
import { updateOrderStatus } from "../api";
import ConfirmModal from "./ConfirmModal";
import AlertModal from "./AlertModal";

// Definimos los 'props' que recibirá este componente
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCloseTable: (table: Table) => void;
  table: Table | null;
  orders: Order[];
  // --- NUEVA PROP: Función para marcar como entregado ---
  onDeliverOrder: (order: Order) => void; 
};

export default function TableDetailModal({
  isOpen,
  onClose,
  onCloseTable,
  table,
  orders,
  onDeliverOrder, // <-- Recibimos la función
}: ModalProps) {
  
  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  
  const [confirmInfo, setConfirmInfo] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    orderToUpdate: Order | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    orderToUpdate: null,
  });
  
  if (!isOpen || !table) {
    return null;
  }

  const tableTotal = orders.reduce((sum, o) => sum + Number(o.total_price), 0);

  const handleCloseClick = () => {
    onCloseTable(table);
  };
  
  const handleCloseAlert = () => {
    setAlertInfo({ isOpen: false, title: "", message: "" });
  };
  
  const handleCloseConfirm = () => {
    setConfirmInfo({ isOpen: false, title: "", message: "", orderToUpdate: null });
  };

  // --- LÓGICA PARA "SOLICITAR CAMBIO" (Negociación) ---
  const handleRequestChange = (order: Order) => {
    setConfirmInfo({
      isOpen: true,
      title: "Solicitar Cambio",
      message: `¿Seguro que quieres solicitar un cambio para el Pedido #${order.id}? Esto alertará a la cocina.`,
      orderToUpdate: order,
    });
  };

  const executeRequestChange = async () => {
    const order = confirmInfo.orderToUpdate;
    if (!order) return;

    try {
      // El backend manejará el cambio de estado a CHANGE_REQUESTED si es necesario
      // Pero para forzar la alerta visual inmediata, podemos usar el estado WAITER_EDITING primero o dejar que el backend responda.
      // Dado el flujo actual, el mesero va a editar, así que esto es redundante si ya tiene botón "Editar".
      // PERO si el botón es "Solicitar Cambio" directo (sin editar items), usamos esto:
      await updateOrderStatus(order.id, "CHANGE_REQUESTED");
      
      handleCloseConfirm();
      setAlertInfo({
        isOpen: true,
        title: "¡Éxito!",
        message: "Solicitud de cambio enviada a la cocina."
      });
      
    } catch (error) {
      handleCloseConfirm();
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAlertInfo({
        isOpen: true,
        title: "Error",
        message: `Error al enviar la solicitud: ${errorMessage}`
      });
    }
  };


  return (
    <div 
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onClose} 
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Encabezado */}
        <div className="p-4 bg-slate-800 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold">{table.code}</h2>
          <div className="text-right">
            <div className="text-sm opacity-80">Total Mesa</div>
            <div className="text-2xl font-mono font-bold">
              S/ {tableTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Lista de Pedidos */}
        <ul className="flex-1 overflow-y-auto">
          {orders.length === 0 ? (
            <li className="p-4 text-center text-sm text-slate-500">
              Esta mesa aún no tiene pedidos registrados.
            </li>
          ) : (
            orders
              .sort((a, b) => a.status.localeCompare(b.status))
              .map(order => (
                <OrderRow 
                  key={order.id} 
                  order={order} 
                  onRequestChange={handleRequestChange}
                  onDeliver={onDeliverOrder} // <-- PASAMOS LA FUNCIÓN AL ROW
                />
              ))
          )}
        </ul>

        {/* Pie de página */}
        <div className="p-4 bg-slate-50 border-t grid grid-cols-3 gap-3">
          <button
            onClick={onClose}
            className="px-4 py-3 rounded-lg bg-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-300 transition-all duration-200"
          >
            Cerrar
          </button>
          
          <Link
            to={`/waiter/new?tableId=${table.id}`} 
            className="px-4 py-3 rounded-lg bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 text-center transition-all duration-200"
          >
            + Añadir Pedido
          </Link>

          <button
            onClick={handleCloseClick}
            disabled={orders.length === 0}
            className="px-4 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-200"
          >
            Cobrar Mesa
          </button>
        </div>
      </div>
      
      {/* Modales de Alerta */}
      <AlertModal
        isOpen={alertInfo.isOpen}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={handleCloseAlert}
      />
      
      <ConfirmModal
        isOpen={confirmInfo.isOpen}
        title={confirmInfo.title}
        message={confirmInfo.message}
        onClose={handleCloseConfirm}
        onConfirm={executeRequestChange}
        confirmText="Sí, Solicitar"
      />
    </div>
  );
}