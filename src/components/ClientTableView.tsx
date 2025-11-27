// src/components/ClientTableView.tsx
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchPublicTable, fetchProducts, callWaiter, submitReview } from "../api";
import type { PublicTableInfo, Product, ReviewData } from "../types";
import AlertModal from "./AlertModal";

export default function ClientTableView() {
  const { code } = useParams(); 
  const navigate = useNavigate(); 

  const [tableInfo, setTableInfo] = useState<PublicTableInfo | null>(null);
  const [menu, setMenu] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [waiterCalled, setWaiterCalled] = useState(false);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const [alertInfo, setAlertInfo] = useState({ isOpen: false, title: "", message: "" });
  const closeAlert = () => setAlertInfo({ isOpen: false, title: "", message: "" });

  // Función para marcar en el navegador que ya terminamos con esta mesa
  const markAsFinished = () => {
      if (code) localStorage.setItem(`review_done_${code}`, 'true');
  };

  const loadTableData = useCallback(async () => {
    if (!code) return;
    
    // --- 1. VERIFICAR MEMORIA LOCAL ---
    // ¿Este celular ya calificó esta mesa recientemente?
    const hasFinished = localStorage.getItem(`review_done_${code}`);

    try {
      const info = await fetchPublicTable(code);
      setTableInfo(info);

      // --- 2. LÓGICA DE REDIRECCIÓN MEJORADA ---
      
      // Caso A: La mesa está LIBRE y NO se puede calificar (tiempo expirado)
      if (info.status === "LIBRE" && !info.can_rate) {
          navigate("/menu", { replace: true });
          return;
      }

      // Caso B: La mesa está LIBRE, se puede calificar, PERO este usuario YA CALIFICÓ
      if (info.status === "LIBRE" && info.can_rate && hasFinished) {
          navigate("/menu", { replace: true });
          return;
      }

      // Cargar Menú si no estamos en modo encuesta
      if (!info.can_rate) {
          const [juices, sandwiches] = await Promise.all([
              fetchProducts("JUICE"), 
              fetchProducts("SANDWICH")
          ]);
          setMenu([...juices, ...sandwiches]);
      }
      
      if (info.needs_assistance) setWaiterCalled(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [code, navigate]);

  useEffect(() => {
    loadTableData();
    if (!code) return;

    const wsUrl = `ws://127.0.0.1:8000/ws/table/${code}/`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log(`Conectado a mesa ${code}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "TABLE_CLOSED") {
          // Limpiamos la marca local por si acaso es una nueva sesión (opcional, pero seguro)
          // En realidad, si se cierra, queremos que califique, así que NO borramos nada.
          loadTableData();
      }

      if (data.type === "WAITER_COMING") {
          setWaiterCalled(false);
          setAlertInfo({ isOpen: true, title: "¡Ayuda en camino!", message: "El mesero ha confirmado tu llamado." });
      }
    };

    return () => socket.close();
  }, [code, loadTableData]);


  // --- ACCIONES ---

  const handleCallWaiter = async () => {
    if (!tableInfo?.session_token || !code) return;
    try {
        setWaiterCalled(true);
        await callWaiter(code, tableInfo.session_token);
        setAlertInfo({ isOpen: true, title: "🔔 Mesero Notificado", message: "Un mesero ha recibido tu alerta." });
    } catch (err) {
        setWaiterCalled(false);
        setAlertInfo({ isOpen: true, title: "Error", message: "No se pudo conectar." });
    }
  };

  const handleRate = (itemId: number, stars: number) => {
      setRatings(prev => ({ ...prev, [itemId]: stars }));
  };

  const handleSubmitReviews = async () => {
      if (!tableInfo?.items_to_rate) return;
      try {
          const promises = tableInfo.items_to_rate.map(item => {
              const stars = ratings[item.item_id];
              if (stars) {
                  const payload: ReviewData = {
                      order_item: item.item_id,
                      rating: stars,
                      comment: "Calificación desde QR"
                  };
                  return submitReview(payload);
              }
              return Promise.resolve();
          });
          
          await Promise.all(promises);
          setReviewSubmitted(true);
          
          // --- 3. GUARDAR MARCA DE FINALIZACIÓN ---
          markAsFinished();
          
          setTimeout(() => navigate("/menu"), 3000);

      } catch (err) {
          setAlertInfo({ isOpen: true, title: "Error", message: "Hubo un problema guardando tu opinión." });
      }
  };
  
  const handleSkip = () => {
      // Si salta, también marcamos como finalizado para que no le vuelva a salir
      markAsFinished();
      navigate("/menu");
  };


  // --- RENDERS ---

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">{error}</div>;
  if (!tableInfo) return null;

  // VISTA 1: ENCUESTA
  if (tableInfo.can_rate && !reviewSubmitted) {
      return (
          <div className="min-h-screen bg-white p-6 max-w-md mx-auto">
              <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Gracias por tu visita!</h1>
              <p className="text-slate-600 mb-8">Ayúdanos a mejorar calificando lo que consumiste.</p>
              
              <div className="space-y-6">
                  {tableInfo.items_to_rate?.map((item) => (
                      <div key={item.item_id} className="border-b pb-4">
                          <p className="font-medium text-slate-800 mb-2">{item.product_name}</p>
                          <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                  <button key={star} onClick={() => handleRate(item.item_id, star)} className={`text-3xl transition-transform hover:scale-110 ${(ratings[item.item_id] || 0) >= star ? 'text-amber-400' : 'text-gray-200'}`}>★</button>
                              ))}
                          </div>
                      </div>
                  ))}
              </div>

              <button onClick={handleSubmitReviews} className="w-full mt-8 bg-slate-900 text-white font-bold py-3 rounded-lg shadow-lg hover:bg-slate-800 transition">
                  Enviar Opinión
              </button>
              
              <button 
                onClick={handleSkip} // Usamos la nueva función handleSkip
                className="w-full mt-4 text-slate-500 py-2 hover:underline"
              >
                  Saltar y ver menú
              </button>
              <AlertModal isOpen={alertInfo.isOpen} title={alertInfo.title} message={alertInfo.message} onClose={closeAlert} />
          </div>
      );
  }
  
  if (reviewSubmitted) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
              <div className="text-6xl mb-4">❤️</div>
              <h2 className="text-2xl font-bold text-slate-800">¡Gracias!</h2>
              <p className="text-slate-600 mt-2">Te estamos redirigiendo al menú...</p>
          </div>
      )
  }

  const juices = menu.filter(p => p.category === 'JUICE');
  const sandwiches = menu.filter(p => p.category === 'SANDWICH');

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
        <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex justify-between items-center">
            <h1 className="font-bold text-lg text-slate-800">Mesa {tableInfo.code}</h1>
            {tableInfo.status === 'OCUPADA' ? <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">● Servicio Activo</span> : <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-medium">Libre</span>}
        </header>

        <main className="p-4 space-y-8">
            {/* (Menú igual) */}
            <section>
                <h2 className="text-xl font-bold text-slate-800 mb-4">🥤 Jugos</h2>
                <div className="grid gap-3">{juices.map(p => (<div key={p.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-start"><div><h3 className="font-semibold">{p.name}</h3><p className="text-sm text-slate-500">{p.description}</p></div><span className="font-mono font-medium bg-slate-100 px-2 py-1 rounded">S/ {p.base_price}</span></div>))}</div>
            </section>
            <section>
                <h2 className="text-xl font-bold text-slate-800 mb-4">🥪 Sandwiches</h2>
                <div className="grid gap-3">{sandwiches.map(p => (<div key={p.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-start"><div><h3 className="font-semibold">{p.name}</h3><p className="text-sm text-slate-500">{p.description}</p></div><span className="font-mono font-medium bg-slate-100 px-2 py-1 rounded">S/ {p.base_price}</span></div>))}</div>
            </section>
        </main>

        {tableInfo.status === 'OCUPADA' && tableInfo.session_token && (
            <div className="fixed bottom-6 left-6 right-6">
                <button onClick={handleCallWaiter} disabled={waiterCalled} className={`w-full font-bold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${waiterCalled ? 'bg-green-600 text-white' : 'bg-amber-500 text-white'}`}>{waiterCalled ? "✅ Mesero Avisado" : "🔔 Llamar al Mesero"}</button>
            </div>
        )}
        <AlertModal isOpen={alertInfo.isOpen} title={alertInfo.title} message={alertInfo.message} onClose={closeAlert} />
    </div>
  );
}