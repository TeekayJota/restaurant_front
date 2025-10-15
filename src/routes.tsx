import { Routes, Route, Link } from "react-router-dom";
import WaiterView from "./components/WaiterView";
import KitchenView from "./components/KitchenView"; // 1. Importa el nuevo componente

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
      <Route path="/waiter" element={<WaiterView />} />
      <Route path="/kitchen" element={<KitchenView />} />
    </Routes>
  );
}