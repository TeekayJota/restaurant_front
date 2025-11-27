// src/types.ts

// --- Tipos de Order ---
export type OrderItem = {
  id: number;
  product_name: string;
  unit_price: number;
  notes: string;
  selected_options: Record<string, unknown>;
};

// Este es el tipo de 'item' que usa el formulario (no tiene ID)
export type Item = {
  product_name: string;
  notes: string;
  selected_options: Record<string, unknown>;
};

export type Order = {
  id: number;
  table_code: string;
  total_price: number;
  
  // Estados
  status: "NEW" | "PREPARING" | "READY" | "CHANGE_REQUESTED" | "PAID" | "WAITER_EDITING" | "DELIVERED";
  
  status_display: string;
  created_at: string;
  items: OrderItem[];

  // Campo de 'cambios propuestos' (Negociación)
  proposed_changes: {
    items?: Item[];
  };

  // Timestamps (Sentido de Urgencia)
  preparing_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  paid_at: string | null;
};


// --- Tipos de Waiter (Mesero) ---

export type Table = {
  id: number;
  code: string;
  is_active: boolean;
  status: "LIBRE" | "OCUPADA";
  needs_assistance: boolean; 
};

// Definimos Choice aquí
type Choice = string | { label: string; value: string };

export type Product = {
  id: number;
  name: string;
  category: string; // <-- CAMPO NUEVO
  base_price: number;
  description?: string;
  // Usamos Choice[] aquí para que el tipo 'Choice' de arriba se considere "usado"
  option_schema?: Record<
    string,
    { type: "single" | "multi" | "boolean" | "select"; label: string; choices?: Choice[] }
  >;
};


// --- Tipos para Cliente (QR) ---

export type PublicTableInfo = {
  id: number;
  code: string;
  status: "LIBRE" | "OCUPADA";
  needs_assistance: boolean;
  can_rate: boolean;
  session_token?: string;
  items_to_rate?: Array<{
    item_id: number;
    product_name: string;
    order_id: number;
  }>;
};

export type ReviewData = {
  order_item: number;
  rating: number;
  comment?: string;
};