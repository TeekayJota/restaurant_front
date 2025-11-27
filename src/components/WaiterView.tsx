// src/components/WaiterView.tsx
// Dashboard de mesero actualizado con soporte para entregas, timestamps y ALERTAS DE CLIENTE.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
// --- 1. IMPORTAR markOrderAsDelivered Y markTableAttended ---
import { fetchTables, fetchOrders, closeTable, markOrderAsDelivered, markTableAttended } from "../api";
import type { Table, Order } from "../types";

import TableCard from "./TableCard";
import TableDetailModal from "./TableDetailModal";
import AlertModal from "./AlertModal";
import ConfirmModal from "./ConfirmModal";

export default function WaiterView() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const isModalOpen = selectedTable !== null;

  const [alertInfo, setAlertInfo] = useState({
    isOpen: false,
    title: "",
    message: "",
  });
  
  const [confirmInfo, setConfirmInfo] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    tableToClose: Table | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    tableToClose: null,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const activeOrderStatuses = [
          "NEW", "PREPARING", "READY", 
          "CHANGE_REQUESTED", "WAITER_EDITING", 
          "DELIVERED" 
      ];

      const [fetchedTables, fetchedOrders] = await Promise.all([
        fetchTables({ active: true, status: "OCUPADA" }),
        fetchOrders(activeOrderStatuses) 
      ]);
      setTables(fetchedTables);
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const wsUrl = "ws://127.0.0.1:8000/ws/kitchen/";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log("WebSocket: Conectado al dashboard de mesero.");
    socket.onclose = () => console.warn("WebSocket: Desconectado del dashboard de mesero.");
    socket.onerror = (error) => console.error("WebSocket (Mesero): Error:", error);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket MENSAJE RECIBIDO:", data);
      
      // --- 2. ESCUCHAR ALERTAS DE CLIENTE (Tiempo Real) ---
      if (data.type === "WAITER_CALL") {
          // Si el mensaje trae status: "OFF", apagamos la alerta. Si no, la encendemos.
          const isCalling = data.status !== "OFF";

          setTables(prev => prev.map(t => 
              t.code === data.table_code 
                  ? { ...t, needs_assistance: isCalling } 
                  : t
          ));
          return; 
      }
      // ----------------------------------------------------

      if (data.type === "NEW_ORDER" || data.type === "STATUS_UPDATE") {
        const { order } = data;
        if (order.status === "PAID") {
            setOrders((prev) => prev.filter((o) => o.id !== order.id));
        } else {
            setOrders((prev) => {
                const existing = prev.find(o => o.id === order.id);
                if (existing) {
                    return prev.map((o) => (o.id === order.id ? order : o));
                } else {
                    return [order, ...prev];
                }
            });
        }
      }
    };
    
    return () => socket.close();
  }, []);

  const ordersByTableCode = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const order of orders) {
      if (!map.has(order.table_code)) {
        map.set(order.table_code, []);
      }
      map.get(order.table_code)!.push(order);
    }
    return map;
  }, [orders]);


  // --- 3. MODIFICADO: Apagar alerta al abrir mesa ---
  const handleOpenModal = async (table: Table) => {
    // Si la mesa está pidiendo ayuda, la marcamos como atendida al abrir
    if (table.needs_assistance) {
        try {
            await markTableAttended(table.id);
            
            // Actualizamos el estado local inmediatamente (Visual)
            setTables(prev => prev.map(t => t.id === table.id ? { ...t, needs_assistance: false } : t));
        } catch (e) {
            console.error("Error al atender mesa:", e);
        }
    }
    
    setSelectedTable(table);
  };
  
  const handleCloseModal = () => {
    setSelectedTable(null);
  };
  
  const handleCloseAlert = () => {
    setAlertInfo({ isOpen: false, title: "", message: "" });
  };
  
  const handleCloseConfirm = () => {
    setConfirmInfo({ isOpen: false, title: "", message: "", tableToClose: null });
  };

  // Manejar la entrega del pedido
  const handleDeliverOrder = async (order: Order) => {
      try {
          await markOrderAsDelivered(order.id);
      } catch (error) {
          console.error(error);
          setAlertInfo({
            isOpen: true,
            title: "Error",
            message: `No se pudo marcar como entregado: ${error instanceof Error ? error.message : String(error)}`
          });
      }
  };

  const handleCloseTable = (table: Table) => {
    const tableOrders = ordersByTableCode.get(table.code) || [];
    const total = tableOrders.reduce((sum, o) => sum + Number(o.total_price), 0);
    
    setConfirmInfo({
      isOpen: true,
      title: `Confirmar Cierre (Mesa ${table.code})`,
      message: `El total a cobrar es S/ ${total.toFixed(2)}. ¿Estás seguro?`,
      tableToClose: table,
    });
  };

  const executeCloseTable = async () => {
    const table = confirmInfo.tableToClose;
    if (!table) return;
    
    try {
      const res = await closeTable(table.id);
      
      setTables(prev => prev.filter(t => t.id !== table.id));
      setOrders(prev => prev.filter(o => o.table_code !== table.code));
      
      handleCloseModal(); 
      handleCloseConfirm(); 
      
      setAlertInfo({
        isOpen: true,
        title: "¡Éxito!",
        message: `✅ Mesa ${table.code} cerrada. Total cobrado: S/ ${res.total_billed}`
      });

    } catch (error) {
      handleCloseConfirm();
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAlertInfo({
        isOpen: true,
        title: "Error al Cerrar Mesa",
        message: errorMessage
      });
      console.error(error);
    }
  };

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-slate-800">Mesas Activas</h1>
        <Link
          to="/waiter/new"
          className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold shadow-sm 
                     hover:bg-green-700 hover:shadow-md 
                     transition-all duration-200"
        >
          + Nuevo Pedido
        </Link>
      </div>

      {isLoading && (
        <div className="text-center py-10 text-slate-500">Cargando mesas...</div>
      )}
      {!isLoading && tables.length === 0 && (
        <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
          <p className="text-sm text-slate-500">
            No hay mesas ocupadas. <br/>
            Haz clic en "+ Nuevo Pedido" para empezar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tables.map(table => {
          const tableOrders = (ordersByTableCode.get(table.code) || []);
          
          return (
            <TableCard 
              key={table.id}
              table={table}
              orders={tableOrders}
              onOpenModal={() => handleOpenModal(table)}
            />
          );
        })}
      </div>
      
      <TableDetailModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCloseTable={handleCloseTable} 
        table={selectedTable}
        orders={selectedTable ? (ordersByTableCode.get(selectedTable.code) || []) : []}
        onDeliverOrder={handleDeliverOrder} 
      />
      
      <AlertModal
        isOpen={alertInfo.isOpen}
        title={alertInfo.title}
        message={alertInfo.message}
        onClose={handleCloseAlert}
      />
      
      <ConfirmModal
        isOpen={confirmInfo.isOpen}
        title={confirmInfo.title}
        message={confirmInfo.message}
        onClose={handleCloseConfirm}
        onConfirm={executeCloseTable}
        confirmText="Sí, Cobrar"
      />
    </div>
  );
}