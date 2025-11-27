// src/components/ConfirmModal.tsx
// Reemplazo reutilizable para la función 'confirm()' del navegador

import type { ReactNode } from "react";

type Props = {
  isOpen: boolean;
  title: string;
  message: ReactNode; // Usamos ReactNode para poder pasar texto o JSX
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onClose: () => void; // Esta es la acción de 'cancelar'
};

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "OK",
  cancelText = "Cancelar",
  onConfirm,
  onClose,
}: Props) {
  
  // Si no está abierto, no renderiza nada
  if (!isOpen) return null;

  return (
    // Fondo oscuro semi-transparente
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose} // Cierra si se hace clic fuera
    >
      {/* Contenedor del Modal */}
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Evita que se cierre al hacer clic dentro
      >
        {/* Encabezado */}
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        </div>
        
        {/* Cuerpo del mensaje */}
        <div className="p-4 text-slate-600">
          {message}
        </div>
        
        {/* Pie de página con botones */}
        <div className="p-3 bg-slate-50 border-t flex justify-end gap-3">
          <button
            onClick={onClose} // Botón de Cancelar
            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 font-semibold shadow-sm hover:bg-slate-300 transition"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm} // Botón de Confirmar
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 transition"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}