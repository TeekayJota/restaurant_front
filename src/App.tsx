import AppRoutes from "./routes";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fa] text-gray-800">
      <header className="border-b bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">🍽️ Restaurante</h1>
      </header>

      <main className="flex-1 p-6">
        <AppRoutes />
      </main>

      <footer className="text-center py-4 text-sm text-gray-500 border-t">
        © 2025 Restaurante App 
      </footer>
    </div>
  );
}
