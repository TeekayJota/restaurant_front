// src/components/OrderCardKitchen.tsx
// Quitamos los botones de Aceptar/Rechazar y añadimos el botón para abrir el modal.

import type { Order } from "../types";
import { updateOrderStatus } from "../api"; 

type OrderCardProps = {
  order: Order;
  // CAMBIO: Nueva prop para abrir el modal
  onOpenChangeModal: (order: Order) => void;
};

export default function OrderCardKitchen({ order, onOpenChangeModal }: OrderCardProps) {
  
  // Funciones de Acción de Estado Normal (sin cambios)
  const handleStatusChange = async (newStatus: "PREPARING" | "READY") => {
    try {
      await updateOrderStatus(order.id, newStatus);
    } catch (error) {
      alert(`Error al actualizar estado: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Lógica de la Card
  const isEditing = order.status === "WAITER_EDITING";
  const isChangeRequested = order.status === "CHANGE_REQUESTED";
  const isNew = order.status === "NEW";
  const isPreparing = order.status === "PREPARING";

  let cardClass = "bg-white p-4 rounded-lg shadow-md";
  if (isChangeRequested) {
      cardClass = "bg-red-100 border-l-4 border-red-600 p-4 rounded-lg shadow-xl animate-pulse";
  } else if (isEditing) {
      cardClass = "bg-yellow-100 border-l-4 border-yellow-600 p-4 rounded-lg shadow-xl opacity-70";
  }

  return (
    <div key={order.id} className={cardClass}>
      
      {/* Encabezado */}
      <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Mesa {order.table_code}</h3>
          <span className="text-sm text-slate-500">Pedido #{order.id}</span>
      </div>
      
      {/* Mensajes de Estado Especiales */}
      {isEditing && (
          <p className="font-bold text-red-600 my-2">
              ⚠️ MESERO MODIFICANDO. NO PREPARAR.
          </p>
      )}
      {isChangeRequested && (
          <p className="font-bold text-red-700 my-2 text-xl">
              🚨 SOLICITUD DE CAMBIO PENDIENTE 🚨
          </p>
      )}

      {/* --- ¡¡BLOQUE RESTAURADO!! --- */}
      {/* DETALLES DEL PEDIDO (No se mostrarán si la card está en modo "Ver Cambios") */}
      {!isChangeRequested && (
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
      )}
      {/* --- FIN DEL BLOQUE RESTAURADO --- */}

      
      {/* --- ACCIONES DE NEGOCIACIÓN (CHANGE_REQUESTED) --- */}
      {isChangeRequested && (
          <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-300">
              <h4 className="font-bold text-red-700 mb-2">Cambios Propuestos:</h4>
              <p className="text-sm text-red-600 mb-3">
                  Revisión obligatoria. El mesero envió una nueva receta/ítems.
              </p>

              <button
                  onClick={() => onOpenChangeModal(order)}
                  className="w-full px-4 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 transition cursor-pointer"
              >
                  👁️ Ver Cambios Propuestos
              </button>
          </div>
      )}

      {/* --- ACCIONES DE FLUJO NORMAL (NEW / PREPARING) --- */}
      {isNew && (
        <button 
          onClick={() => handleStatusChange("PREPARING")}
          disabled={isEditing || isChangeRequested}
          className="w-full mt-4 px-4 py-2 rounded-md bg-blue-500 text-white font-semibold hover:bg-blue-600 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Empezar Preparación
        </button>
      )}
      
      {isPreparing && !isChangeRequested && (
        <button 
          onClick={() => handleStatusChange("READY")}
          disabled={isEditing}
          className="w-full mt-4 px-4 py-2 rounded-md bg-green-500 text-white font-semibold hover:bg-green-600 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          Marcar como Listo
        </button>
      )}

    </div>
  );
}