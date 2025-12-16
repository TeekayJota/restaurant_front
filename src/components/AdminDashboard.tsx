// src/components/AdminDashboard.tsx
import { useEffect, useState } from "react";
import { fetchDashboardStats } from "../api";
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
    LineChart, Line
} from 'recharts';
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await fetchDashboardStats();
      setStats(data);
    } catch (err) {
      setError("Error cargando datos.");
      if ((err as Error).message === "Sesión expirada") navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleLogout = () => {
      localStorage.removeItem("admin_token");
      navigate("/login");
  };

  if (loading) return <div className="p-10 text-center">Cargando métricas...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;
  if (!stats) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Panel de Control 📊</h1>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">
            Salir
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
            <p className="text-slate-500 text-sm font-medium">Ventas Totales</p>
            <p className="text-3xl font-bold text-slate-800">S/ {stats.kpi.total_sales}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-slate-500 text-sm font-medium">Pedidos</p>
            <p className="text-3xl font-bold text-slate-800">{stats.kpi.orders_count}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
            <p className="text-slate-500 text-sm font-medium">Tiempo Promedio</p>
            <p className="text-3xl font-bold text-slate-800">{stats.kpi.avg_prep_time_minutes} min</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Productos */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-slate-700">🏆 Top Ventas</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.top_products} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="product_name" width={100} tick={{fontSize: 11}} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} name="Vendidos" />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Historial de Ventas */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-slate-700">📈 Historial de Ventas</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.sales_history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{fontSize: 12}} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{r: 4}} name="Ventas (S/)" />
                    </LineChart>
                </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* Tiempos por Producto */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold mb-4 text-slate-700">⏱️ Tiempo Promedio por Producto (min)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.prep_time_by_product}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="product" tick={{fontSize: 11}} />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} min`} />
                    <Bar dataKey="minutes" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} name="Minutos" />
                </BarChart>
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
}