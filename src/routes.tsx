import { Routes, Route, Link } from "react-router-dom";
import WaiterView from "./components/WaiterView";
import KitchenView from "./components/KitchenView";
import NewOrderPage from "./components/NewOrderPage";
import EditOrderPage from "./components/EditOrderPage";
import ClientTableView from "./components/ClientTableView";
import PublicMenu from "./components/PublicMenu";

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <h2 className="text-3xl font-semibold mb-6 text-gray-800">
              Selecciona una vista
            </h2>
            <div className="flex gap-4">
              <Link
                to="/waiter"
                className="px-6 py-3 bg-amber-500 text-white rounded-full font-medium shadow hover:bg-amber-600 transition"
              >
                Mesero
              </Link>
              <Link
                to="/kitchen"
                className="px-6 py-3 bg-gray-700 text-white rounded-full font-medium shadow hover:bg-gray-800 transition"
              >
                Cocina
              </Link>
            </div>
          </div>
        }
      />
      
      {/* Rutas de Mesero */}
      <Route path="/waiter" element={<WaiterView />} />
      <Route path="/waiter/new" element={<NewOrderPage />} />
      <Route path="/waiter/edit/:orderId" element={<EditOrderPage />} />

      {/* Ruta de Cocina */}
      <Route path="/kitchen" element={<KitchenView />} />

      {/* --- 2. NUEVA RUTA PÚBLICA (QR) --- */}
      <Route path="/table/:code" element={<ClientTableView />} />
      <Route path="/menu" element={<PublicMenu />} />
    </Routes>
  );
}