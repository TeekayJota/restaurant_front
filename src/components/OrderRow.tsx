// src/components/OrderRow.tsx
import type { Order } from "../types";
import { Link } from "react-router-dom";

type OrderRowProps = {
  order: Order;
  onRequestChange: (order: Order) => void;
  onDeliver: (order: Order) => void; // <-- NUEVA PROP
};

export default function OrderRow({ order, onRequestChange, onDeliver }: OrderRowProps) {
  
  const isEditable = ["NEW", "PREPARING", "WAITER_EDITING"].includes(order.status);

  // Estilos dinámicos para el estado
  let statusStyle = "bg-slate-100 text-slate-800";
  if (order.status === 'NEW') statusStyle = "bg-blue-100 text-blue-800";
  else if (order.status === 'PREPARING') statusStyle = "bg-amber-100 text-amber-800";
  else if (order.status === 'READY') statusStyle = "bg-green-100 text-green-800 font-bold"; // Resaltar READY
  else if (order.status === 'DELIVERED') statusStyle = "bg-gray-200 text-gray-500"; // Apagado
  else if (order.status === 'CHANGE_REQUESTED') statusStyle = "bg-red-100 text-red-800 animate-pulse";

  return (
    <li className={`py-3 px-4 border-t border-slate-200 space-y-2 ${order.status === 'DELIVERED' ? 'opacity-60' : ''}`}>
      <div className="flex justify-between items-center">
        <span className="font-semibold text-slate-700">Pedido #{order.id}</span>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
          {order.status_display}
        </span>
      </div>
      
      <ul className="pl-4 space-y-1">
        {order.items.map(item => (
          <li key={item.id} className="flex justify-between text-sm text-slate-600">
            <span>{item.product_name}</span>
            <span className="font-mono">S/ {item.unit_price}</span>
          </li>
        ))}
      </ul>
      
      <div className="flex gap-2 mt-2">
        {/* Botones de Edición (Solo si no está listo/entregado) */}
        {isEditable && (
          <Link
            to={`/waiter/edit/${order.id}`}
            className="flex-1 text-center text-xs px-3 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition"
          >
            Editar
          </Link>
        )}
        
        {order.status === 'PREPARING' && (
          <button 
            onClick={() => onRequestChange(order)}
            className="flex-1 text-center text-xs px-3 py-2 bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 transition"
          >
            Solicitar Cambio
          </button>
        )}

        {/* --- NUEVO BOTÓN DE ENTREGA --- */}
        {order.status === 'READY' && (
            <button 
                onClick={() => onDeliver(order)}
                className="w-full text-center text-sm px-3 py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition shadow-sm"
            >
                ✅ Marcar como Entregado
            </button>
        )}
      </div>
    </li>
  );
}