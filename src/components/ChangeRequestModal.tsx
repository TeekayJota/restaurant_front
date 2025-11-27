// src/components/ChangeRequestModal.tsx
// CORREGIDO: Se usa 'finally' en handleNegotiation para re-habilitar los botones.

import type { Order, OrderItem, Item } from "../types";
import { acceptChange, rejectChange } from "../api";
import { useMemo, useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onStatusUpdated: () => void;
};

// Función de ayuda (sin cambios)
const formatOptions = (options: Record<string, unknown>) => {
    return Object.entries(options)
        .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
        .map(([key, value]) => 
            `${key.charAt(0).toUpperCase() + key.slice(1)}: ${Array.isArray(value) ? value.join(', ') : value}`
        ).join('; ');
};


export default function ChangeRequestModal({ isOpen, onClose, order, onStatusUpdated }: Props) {
  
  // Hooks (movidos al inicio)
  const [isSending, setIsSending] = useState(false);

  const changes = useMemo(() => {
    if (!order || !order.proposed_changes?.items || !order.items) {
      return [];
    }
    const currentItems = order.items;
    const proposedItems = order.proposed_changes.items as Item[];
    const changesList: Array<{
      current: OrderItem | null;
      proposed: Item | null;
      type: 'MODIFIED' | 'ADDED' | 'REMOVED';
      productName: string;
      notesChanged: boolean;
      optionsChanged: boolean;
    }> = [];
    const currentMap = new Map(currentItems.map(item => [item.product_name, item]));
    const proposedMap = new Map(proposedItems.map(item => [item.product_name, item]));
    for (const currentItem of currentItems) {
      const proposedItem = proposedMap.get(currentItem.product_name);
      if (!proposedItem) {
        changesList.push({ current: currentItem, proposed: null, type: 'REMOVED', productName: currentItem.product_name, notesChanged: false, optionsChanged: false });
      } else {
        const notesChanged = (currentItem.notes || '') !== (proposedItem.notes || '');
        const optionsChanged = JSON.stringify(currentItem.selected_options || {}) !== JSON.stringify(proposedItem.selected_options || {});
        if (notesChanged || optionsChanged) {
          changesList.push({ current: currentItem, proposed: proposedItem, type: 'MODIFIED', productName: currentItem.product_name, notesChanged, optionsChanged });
        }
      }
    }
    for (const proposedItem of proposedItems) {
      if (!currentMap.has(proposedItem.product_name)) {
        changesList.push({ current: null, proposed: proposedItem, type: 'ADDED', productName: proposedItem.product_name, notesChanged: false, optionsChanged: false });
      }
    }
    return changesList;
  }, [order]);
  
  // Función de negociación (CORREGIDA)
  const handleNegotiation = async (action: 'ACCEPT' | 'REJECT') => {
    if (!order) return;
    
    setIsSending(true);
    try {
      if (action === 'ACCEPT') {
        await acceptChange(order.id);
      } else {
        await rejectChange(order.id);
      }
      onStatusUpdated();
      onClose();
    } catch (error) {
      alert(`Error al negociar: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // --- ¡¡ESTA ES LA CORRECCIÓN!! ---
      // Se ejecuta siempre, después del try o del catch.
      setIsSending(false);
    }
  };
  
  // --- Returns condicionales (después de los hooks) ---
  if (!isOpen || !order) return null; 

  const hasProposedItems = order.proposed_changes?.items && order.proposed_changes.items.length > 0;

  // Modal de Error de Datos (si el backend falló)
  if (order.status === 'CHANGE_REQUESTED' && !hasProposedItems) {
       return (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={onClose}>
              <div 
                  className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm" 
                  onClick={(e) => e.stopPropagation()}
              >
                  <h3 className="text-xl font-bold text-red-600">Error: Datos de Cambio Incompletos</h3>
                  <p className="mt-2 text-slate-700">El pedido **#{order.id}** está en "Cambio Solicitado" pero no contiene ítems propuestos. (Fallo del backend al guardar). Por favor, presione **"Rechazar Cambios"** para desbloquear el pedido.</p>
                  
                  <div className="mt-4 flex justify-end">
                      <button
                          onClick={() => handleNegotiation('REJECT')}
                          disabled={isSending}
                          className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 transition disabled:bg-slate-300 mr-2"
                      >
                          {isSending ? 'Rechazando...' : '❌ Rechazar Cambios'}
                      </button>
                      <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 transition"
                      >
                        Cerrar Alerta
                      </button>
                  </div>
              </div>
          </div>
       );
  }
  
  // Modal de Negociación (si los datos están OK)
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="p-4 bg-red-600 text-white flex justify-between items-center">
          <h3 className="text-xl font-bold">🚨 Solicitud de Cambio (Mesa {order.table_code})</h3>
          <span className="text-sm">Pedido #{order.id}</span>
        </div>

        {/* Contenido de Cambios */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-red-700 font-semibold">
            El mesero ha propuesto cambios. Decida si es viable modificando la preparación actual.
          </p>

          {changes.length === 0 ? (
              <p className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                ⚠️ El mesero no realizó cambios significativos en los ítems/opciones. (Rechazar para continuar).
              </p>
          ) : (
            <ul className="space-y-4">
              {changes.map((change, index) => (
                <li key={index} className="border p-3 rounded shadow-sm">
                  <div className="font-bold mb-2 flex items-center gap-2 text-lg">
                    {change.type === 'ADDED' && <span className="text-green-600">➕ Añadido:</span>}
                    {change.type === 'REMOVED' && <span className="text-red-600">➖ Eliminado:</span>}
                    {change.type === 'MODIFIED' && <span className="text-amber-600">✏️ Modificado:</span>}
                    {change.productName}
                  </div>
                  
                  <div className="pl-4 text-sm space-y-1">
                    {change.type === 'REMOVED' && (
                        <p className="text-red-500">Se eliminará este ítem completamente de la orden.</p>
                    )}
                    {change.type === 'ADDED' && (
                        <p className="text-green-500">Se agregará este ítem nuevo.</p>
                    )}
                    {change.type === 'MODIFIED' && (
                       <div className="bg-slate-50 p-2 rounded">
                        <h5 className="font-semibold mb-1 text-sm border-b">Detalle de Cambios:</h5>
                        
                        {change.notesChanged && (
                            <p className="text-slate-600">
                                Notas: <span className="text-red-500 line-through">{change.current?.notes || 'Ninguna'}</span> &rarr; <span className="text-green-500">{change.proposed?.notes || 'Ninguna'}</span>
                            </p>
                        )}
                        
                        {change.optionsChanged && (
                            <div className="text-slate-600 mt-2 border-t pt-1">
                                <p className="font-semibold">Opciones de Preparación:</p>
                                <p>Anterior: <span className="text-red-500">{formatOptions(change.current?.selected_options || {})}</span></p>
                                <p>Nuevo: <span className="text-green-500">{formatOptions(change.proposed?.selected_options || {})}</span></p>
                            </div>
                        )}
                       </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pie de página con botones de Aprobación */}
        <div className="p-4 bg-slate-50 border-t flex gap-3 justify-end">
          <button
            onClick={() => handleNegotiation('REJECT')}
            disabled={isSending}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 transition disabled:bg-slate-300"
          >
            {isSending ? 'Rechazando...' : '❌ Rechazar Cambios'}
          </button>
          <button
            onClick={() => handleNegotiation('ACCEPT')}
            disabled={isSending}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold shadow-sm hover:bg-green-700 transition disabled:bg-slate-300"
          >
            {isSending ? 'Aceptando...' : '✅ Aceptar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}