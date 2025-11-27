// src/components/PublicMenu.tsx
// Vista pública del menú (sin mesa, sin llamar mesero)

import { useEffect, useState } from "react";
import { fetchProducts } from "../api";
import type { Product } from "../types";

export default function PublicMenu() {
  const [menu, setMenu] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [juices, sandwiches] = await Promise.all([
            fetchProducts("JUICE"), 
            fetchProducts("SANDWICH")
        ]);
        setMenu([...juices, ...sandwiches]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando carta...</div>;

  const juices = menu.filter(p => p.category === 'JUICE');
  const sandwiches = menu.filter(p => p.category === 'SANDWICH');

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
        <header className="bg-slate-900 text-white shadow-sm p-4 sticky top-0 z-10 text-center">
            <h1 className="font-bold text-xl">Nuestra Carta</h1>
        </header>

        <main className="p-4 space-y-8 max-w-md mx-auto">
            <section>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">🥤 Jugos</h2>
                <div className="grid gap-3">
                    {juices.map(p => (
                        <div key={p.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-slate-800">{p.name}</h3>
                                <p className="text-sm text-slate-500">{p.description}</p>
                            </div>
                            <span className="font-mono font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded">S/ {p.base_price}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">🥪 Sandwiches</h2>
                <div className="grid gap-3">
                    {sandwiches.map(p => (
                        <div key={p.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-slate-800">{p.name}</h3>
                                <p className="text-sm text-slate-500">{p.description}</p>
                            </div>
                            <span className="font-mono font-medium text-slate-900 bg-slate-100 px-2 py-1 rounded">S/ {p.base_price}</span>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    </div>
  );
}