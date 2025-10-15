const API_URL = "http://127.0.0.1:8000/api";

/**
 * Define la estructura de una respuesta de API paginada de Django.
 */
type ApiListResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

/**
 * Función de ayuda para manejar respuestas que pueden ser paginadas o un array simple.
 * @param data La respuesta del JSON de la API.
 * @returns Un array con los elementos.
 */
function handleListResponse<T>(data: T[] | ApiListResponse<T>): T[] {
  // Si la respuesta ya es un array, la devolvemos directamente.
  if (Array.isArray(data)) {
    return data;
  }
  // Si es un objeto, devolvemos la propiedad 'results'.
  return data.results;
}


// --- Funciones de la API ---

export async function fetchProducts(category?: string) {
  const url = category ? `${API_URL}/products/?category=${category}` : `${API_URL}/products/`;
  const res = await fetch(url);
  const data = await res.json();
  return handleListResponse(data);
}

export async function fetchOrders() {
  const res = await fetch(`${API_URL}/orders/`);
  const data = await res.json();
  return handleListResponse(data);
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

export async function fetchTables(onlyActive = true) {
  const url = onlyActive ? `${API_URL}/tables/?active=true` : `${API_URL}/tables/`;
  const res = await fetch(url);
  const data = await res.json();
  return handleListResponse(data);
}