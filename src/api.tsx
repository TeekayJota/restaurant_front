// src/api.ts
import type { Order, Product, Table, PublicTableInfo, ReviewData } from "./types";

const API_URL = "http://127.0.0.1:8000/api";

type ApiListResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function handleListResponse<T>(data: T[] | ApiListResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results;
}


// --- Funciones de la API ---

export async function fetchProducts(category?: string): Promise<Product[]> {
  const url = category ? `${API_URL}/products/?category=${category}` : `${API_URL}/products/`;
  const res = await fetch(url);
  const data = await res.json();
  return handleListResponse<Product>(data);
}

export async function fetchOrders(statuses?: string[]): Promise<Order[]> {
  let url = `${API_URL}/orders/`;
  if (statuses && statuses.length > 0) {
    url += `?status=${statuses.join(',')}`;
  }
  const res = await fetch(url);
  const data = await res.json();
  return handleListResponse<Order>(data);
}

export async function fetchOrderDetails(id: number): Promise<Order> {
  const res = await fetch(`${API_URL}/orders/${id}/`);
  if (!res.ok) {
    throw new Error("No se pudo cargar el pedido");
  }
  return await res.json();
}

export async function createOrder(orderData: any) {
  const res = await fetch(`${API_URL}/orders/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });
  return await res.json();
}

export async function updateOrderStatus(id: number, status: string) {
  const res = await fetch(`${API_URL}/orders/${id}/set_status/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return await res.json();
}

export async function fetchTables(options: { active?: boolean; status?: string }): Promise<Table[]> {
  const params = new URLSearchParams();
  if (options.active) {
    params.append("active", "true");
  }
  if (options.status) {
    params.append("status", options.status);
  }
  const url = `${API_URL}/tables/?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  return handleListResponse<Table>(data);
}

export async function updateOrder(id: number, orderData: any) {
  const res = await fetch(`${API_URL}/orders/${id}/`, {
    method: "PATCH", 
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al actualizar pedido");
  }
  return await res.json();
}

export async function deleteOrder(id: number) {
  await fetch(`${API_URL}/orders/${id}/`, {
    method: "DELETE",
  });
  return true; 
}

export async function closeTable(tableId: number) {
  const res = await fetch(`${API_URL}/orders/close-table/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table_id: tableId }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al cerrar la mesa");
  }
  return await res.json();
}

// --- Funciones de Cocina ---
export async function acceptChange(orderId: number) {
  const res = await fetch(`${API_URL}/orders/${orderId}/accept-change/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al aceptar el cambio");
  }
  return await res.json();
}

export async function rejectChange(orderId: number) {
  const res = await fetch(`${API_URL}/orders/${orderId}/reject-change/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al rechazar el cambio");
  }
  return await res.json();
}

// --- NUEVAS FUNCIONES AÑADIDAS ---

// 1. Para marcar como entregado (Mesero)
export async function markOrderAsDelivered(orderId: number) {
  const res = await fetch(`${API_URL}/orders/${orderId}/mark-delivered/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "Error al marcar como entregado");
  }
  return await res.json();
}

// 2. Para obtener info pública de la mesa (QR Cliente)
export async function fetchPublicTable(code: string): Promise<PublicTableInfo> {
  const res = await fetch(`${API_URL}/customer/table/${code}/`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Mesa no encontrada");
    throw new Error("Error cargando mesa");
  }
  return await res.json();
}

// 3. Para llamar al mesero (QR Cliente)
export async function callWaiter(code: string, token: string) {
  const res = await fetch(`${API_URL}/customer/table/${code}/call/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "No se pudo llamar al mesero");
  }
  return await res.json();
}

// 4. Para enviar review (QR Cliente)
export async function submitReview(data: ReviewData) {
  const res = await fetch(`${API_URL}/customer/rate/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  
  if (!res.ok) {
    throw new Error("Error enviando calificación");
  }
  return await res.json();
}

export async function markTableAttended(tableId: number) {
  const res = await fetch(`${API_URL}/tables/${tableId}/mark_attended/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Error al marcar mesa como atendida");
  return await res.json();
}

// --- AUTENTICACIÓN (ADMIN) ---

export async function loginUser(username: string, password: string) {
  const res = await fetch(`${API_URL}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error("Credenciales incorrectas");
  }

  // La respuesta trae { access: "...", refresh: "..." }
  return await res.json();
}

export async function fetchDashboardStats() {
  const token = localStorage.getItem("admin_token");
  if (!token) throw new Error("No autenticado");

  const res = await fetch(`${API_URL}/dashboard/stats/`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Sesión expirada");
    throw new Error("Error cargando reportes");
  }
  return await res.json();
}