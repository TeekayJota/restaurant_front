// src/components/TableCard.tsx
import { useEffect, useState } from "react";
import type { Table, Order } from "../types";

type TableCardProps = {
  table: Table;
  orders: Order[];
  onOpenModal: () => void;
};

export default function TableCard({ table, orders, onOpenModal }: TableCardProps) {
  
  const tableTotal = orders.reduce((sum, o) => sum + Number(o.total_price), 0);
  
  // Lógica del temporizador (sin cambios)
  const [timeAgo, setTimeAgo] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);

  const readyOrders = orders.filter(o => o.status === "READY");
  const hasChangeRequest = orders.some(o => o.status === "CHANGE_REQUESTED");
  const activeOrders = orders.filter(o => o.status !== "PAID");
  const allServiceCompleted = activeOrders.length > 0 && activeOrders.every(o => o.status === "READY" || o.status === "DELIVERED");

  useEffect(() => {
    if (readyOrders.length === 0) {
      setTimeAgo(null);
      return;
    }
    const calculateTime = () => {
      const oldestReadyTime = readyOrders
        .map(o => o.ready_at ? new Date(o.ready_at).getTime() : Date.now())
        .sort()[0];
      
      const now = Date.now();
      const diffMinutes = Math.floor((now - oldestReadyTime) / 60000);

      if (diffMinutes < 1) {
        setTimeAgo("Hace un momento");
        setIsUrgent(false);
      } else {
        setTimeAgo(`Hace ${diffMinutes} min`);
        setIsUrgent(diffMinutes >= 5);
      }
    };
    calculateTime(); 
    const interval = setInterval(calculateTime, 60000); 
    return () => clearInterval(interval);
  }, [readyOrders]); 


  // --- LÓGICA DE ESTADO VISUAL MEJORADA ---
  
  let statusText = "Ocupada";
  let statusColor = "bg-blue-100 text-blue-800";
  let cardBorderClass = ""; // Clase extra para bordes

  // 1. PRIORIDAD MÁXIMA: El cliente está llamando
  if (table.needs_assistance) {
      statusText = "🔔 SOLICITAN AYUDA";
      statusColor = "bg-orange-100 text-orange-800 font-bold animate-pulse";
      cardBorderClass = "ring-4 ring-orange-400";
  } 
  // 2. Prioridad: Solicitud de cambio de cocina
  else if (hasChangeRequest) {
    statusText = "¡Atención Cocina!";
    statusColor = "bg-red-100 text-red-800 animate-pulse";
  } 
  // 3. Prioridad: Pedido Listo
  else if (timeAgo) {
    statusText = `Listo (${timeAgo})`;
    statusColor = isUrgent 
        ? "bg-red-100 text-red-800 border border-red-500 animate-pulse"
        : "bg-green-100 text-green-800 border border-green-500";
    
    if (isUrgent) cardBorderClass = "ring-4 ring-red-300";
  } 
  // 4. Prioridad: Todo servido
  else if (allServiceCompleted) {
    statusText = "Lista para Cobrar";
    statusColor = "bg-emerald-100 text-emerald-800";
  }


  return (
    <article 
      className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col transition-all duration-300 ${cardBorderClass}`}
    >
      {/* Encabezado dinámico: Si llaman, se pone naranja */}
      <div className={`p-4 text-white flex justify-between items-center ${table.needs_assistance ? 'bg-orange-500' : (isUrgent ? 'bg-red-600' : 'bg-slate-800')}`}>
        <h2 className="text-2xl font-bold">{table.code}</h2>
        {isUrgent && !table.needs_assistance && <span className="text-xs font-bold bg-white text-red-600 px-2 py-1 rounded">DEMORA</span>}
        {table.needs_assistance && <span className="text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded">🔔</span>}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-slate-500">Estado</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-slate-500">Pedidos Activos</span>
          <span className="font-semibold text-slate-800">{orders.length}</span>
        </div>

        <div className="flex justify-between items-center border-t pt-3">
          <span className="text-lg font-bold text-slate-800">Total</span>
          <span className="text-2xl font-mono font-bold text-slate-900">
            S/ {tableTotal.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="p-3 bg-slate-50 border-t">
        <button
          onClick={onOpenModal}
          className={`w-full px-4 py-2 rounded-lg font-semibold shadow-sm transition-all duration-200 text-white
            ${table.needs_assistance ? 'bg-orange-500 hover:bg-orange-600' : (isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700')}
          `}
        >
          {table.needs_assistance ? "Atender Mesa" : "Ver / Cobrar"}
        </button>
      </div>
    </article>
  );
}