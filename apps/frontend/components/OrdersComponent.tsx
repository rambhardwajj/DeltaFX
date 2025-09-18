/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { api } from "@/utils/api";
import { useEffect, useState } from "react";

export interface OrderI {
  asset: string;
  entryPrice: number;
  id: string;
  leverage: number;
  liquidationPrice: number;
  margin: number;
  quantity: number;
  slippage: number;
  status: "OPEN" | "CLOSED" | "PENDING";
  type: "long" | "short";
  userId: string;
}

export interface ClosedOrderI {
  assetId: string;
  closePrice: number;
  createdAt: string;
  id: string;
  leverage: number;
  liquidated: boolean;
  openPrice: number;
  pnl: number;
  userId: string;
  type?: "long" | "short"; // Might not be available
  margin?: number; // Might not be available
  quantity?: number; // Might not be available
}

interface OrdersComponentProps {
  orders: OrderI[]; 
  history: string;
  setHistory: (value: string) => void;
  currPrices: Record<string, { price: number; buyPrice: number }>;
  onCloseOrder?: (orderId: string) => void;
  onPnLUpdate?: (totalPnL: number) => void;
}

export const OrdersComponent: React.FC<OrdersComponentProps> = ({
  orders,
  history,
  setHistory,
  currPrices,
  onCloseOrder,
  onPnLUpdate,
}) => {
  const [closedOrders, setClosedOrders] = useState<ClosedOrderI[]>([]);
  const [isLoadingClosed, setIsLoadingClosed] = useState(false);

  useEffect(() => {
    async function getClosedOrders() {
      if (history !== "Closed") return; 
      
      try {
        setIsLoadingClosed(true);
        const res = await api.get('/trade/get-closed-orders', {
          withCredentials: true
        });
        setClosedOrders(res.data.data || []);
        console.log("Closed orders:", res.data.data);
      } catch (error) {
        console.error("Error fetching closed orders:", error);
        setClosedOrders([]);
      } finally {
        setIsLoadingClosed(false);
      }
    }
    
    getClosedOrders();
  }, [history, orders]); 

  const getFilteredOrders = () => {
    switch (history) {
      case "OPEN":
        return orders.filter((order) => order.status === "OPEN");
      case "Pending":
        return orders.filter((order) => order.status === "PENDING");
      case "Closed":
        return closedOrders;
      default:
        return orders;
    }
  };

  const filteredOrders = getFilteredOrders();

  const getAssetSymbol = (fullAsset: string) => {
    if (fullAsset.includes("BTC")) return "BTC";
    if (fullAsset.includes("SOL")) return "SOL";
    if (fullAsset.includes("ETH")) return "ETH";
    return fullAsset;
  };

  const calculatePnL = (order: OrderI) => {
    const assetSymbol = getAssetSymbol(order.asset);
    const currentPriceRaw = currPrices[assetSymbol]?.price || 0;

    if (currentPriceRaw === 0) return { pnl: 0, pnlPercentage: 0 };

    const entryPrice = order.entryPrice / 100;
    const margin = order.margin / 100;
    const currentPrice = currentPriceRaw;
    const quantity = order.quantity;

    let pnl = 0;
    if (order.type === "long") {
      pnl = (currentPrice - entryPrice) * quantity * order.leverage;
    } else {
      pnl = (entryPrice - currentPrice) * quantity * order.leverage;
    }

    const pnlPercentage = (pnl / margin) * 100;
    return { pnl, pnlPercentage };
  };

  useEffect(() => {
    if (onPnLUpdate) {
      const openPositions = orders.filter((order) => order.status === "OPEN");
      const totalPnL = openPositions.reduce((sum, order) => {
        const { pnl } = calculatePnL(order);
        return sum + pnl;
      }, 0);

      onPnLUpdate(totalPnL);
    }
  }, [orders, currPrices, onPnLUpdate]);
  
  const getTypeColor = (type: string) => {
    return type === "long" ? "text-green-400" : "text-red-400";
  };

  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return "text-green-400";
    if (pnl < 0) return "text-red-400";
    return "text-gray-300";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + " " + 
           new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderOrderRow = (order: OrderI | ClosedOrderI, index: number) => {
    const isClosedOrder = 'openPrice' in order;
    
    if (isClosedOrder) {
      // Closed order rendering
      const closedOrder = order as ClosedOrderI;
      const assetSymbol = closedOrder.assetId;
      const realizedPnL = closedOrder.pnl / 100; 
      
      return (
        <div
          key={closedOrder.id}
          className="grid grid-cols-10 gap-4 px-4 py-3 bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
        >
          {/* Asset */}
          <div className="flex items-center space-x-2">
            <img
              src={`/${assetSymbol}.png`}
              alt={assetSymbol}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-white font-medium">{assetSymbol}</span>
          </div>

          <div className="text-gray-400">
            {closedOrder.liquidated ? "Liquidated" : "Manual"}
          </div>
          <div className="text-gray-400">-</div>
          <div className="text-white">
            ${(closedOrder.openPrice / 100).toLocaleString()}
          </div>

          <div className="text-white">
            ${(closedOrder.closePrice / 100).toLocaleString()}
          </div>
          <div className="text-gray-400">-</div>
          <div className="text-white">{closedOrder.leverage}x</div>
          <div className={`font-medium ${getPnLColor(realizedPnL)}`}>
            <div>${realizedPnL.toFixed(2)}</div>
            <div className="text-xs text-gray-400">
              {formatDate(closedOrder.createdAt)}
            </div>
          </div>
          <div className="flex items-center">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-400">
              {closedOrder.liquidated ? "LIQUIDATED" : "CLOSED"}
            </span>
          </div>
          <div className="text-gray-400">-</div>
        </div>
      );
    } else {
      // Open/Pending order rendering
      const openOrder = order as OrderI;
      const assetSymbol = getAssetSymbol(openOrder.asset);
      const currentPrice = currPrices[assetSymbol]?.price || 0;
      const { pnl, pnlPercentage } = calculatePnL(openOrder);

      return (
        <div
          key={openOrder.id}
          className="grid grid-cols-10 gap-4 px-4 py-3 bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
        >
          {/* Asset */}
          <div className="flex items-center space-x-2">
            <img
              src={`/${assetSymbol}.png`}
              alt={assetSymbol}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-white font-medium">{assetSymbol}</span>
          </div>

          {/* Type */}
          <div className={`font-medium uppercase ${getTypeColor(openOrder.type)}`}>
            {openOrder.type}
          </div>

          {/* Size (Quantity) */}
          <div className="text-white">{openOrder.quantity.toFixed(6)}</div>

          {/* Entry Price */}
          <div className="text-white">
            ${Number(openOrder.entryPrice / 100).toLocaleString()}
          </div>

          {/* Current Price */}
          <div className="text-white">
            {currentPrice > 0 ? `$${currentPrice.toLocaleString()}` : "-"}
          </div>

          {/* Margin */}
          <div className="text-white">${Number(openOrder.margin) / 100}</div>

          {/* Leverage */}
          <div className="text-white">{openOrder.leverage}x</div>

          {/* Unrealized P&L */}
          <div className={`font-medium ${getPnLColor(pnl)}`}>
            <div>${pnl.toFixed(2)}</div>
            <div className="text-xs">
              ({pnlPercentage > 0 ? "+" : ""}
              {pnlPercentage.toFixed(2)}%)
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                openOrder.status === "OPEN"
                  ? "bg-green-600/20 text-green-400"
                  : "bg-yellow-600/20 text-yellow-400"
              }`}
            >
              {openOrder.status}
            </span>
          </div>

          {/* Action */}
          <div>
            {openOrder.status === "OPEN" && onCloseOrder && (
              <button
                onClick={() => onCloseOrder(openOrder.id)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="border-t border-[#1a1a1a] p-3 mr-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Order History</h3>
        <select
          className="bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          value={history}
          onChange={(e) => setHistory(e.target.value)}
        >
          <option value="Pending">Pending Orders</option>
          <option value="OPEN">Open Positions</option>
          <option value="Closed">Order History</option>
        </select>
      </div>

      {isLoadingClosed && history === "Closed" ? (
        <div className="text-center py-8 text-gray-400">
          <p>Loading closed orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No {history.toLowerCase()} orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-10 gap-4 px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-[#1a1a1a]">
            <div>Asset</div>
            <div>Type</div>
            <div>Size</div>
            <div>{history === "Closed" ? "Open Price" : "Entry Price"}</div>
            <div>{history === "Closed" ? "Close Price" : "Current Price"}</div>
            <div>Margin</div>
            <div>Leverage</div>
            <div>{history === "Closed" ? "Realized P&L" : "Unrealized P&L"}</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          {/* Orders */}
          {filteredOrders.map((order, index) => renderOrderRow(order, index))}
        </div>
      )}

      {history === "OPEN" && filteredOrders.length > 0 && (
        <div className="mt-6 p-4 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Portfolio Summary
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Positions: </span>
              <span className="text-white">{filteredOrders.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Margin: </span>
              <span className="text-white">
                $
                {Number(
                  (filteredOrders as OrderI[]).reduce((sum, order) => sum + order.margin, 0)
                ) / 100}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total P&L: </span>
              <span
                className={getPnLColor(
                  (filteredOrders as OrderI[]).reduce((sum, order) => {
                    const { pnl } = calculatePnL(order);
                    return sum + pnl;
                  }, 0)
                )}
              >
                $
                {(filteredOrders as OrderI[])
                  .reduce((sum, order) => {
                    const { pnl } = calculatePnL(order);
                    return sum + pnl;
                  }, 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {history === "Closed" && filteredOrders.length > 0 && (
        <div className="mt-6 p-4 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Closed Orders Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Closed Orders: </span>
              <span className="text-white">{filteredOrders.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Realized P&L: </span>
              <span
                className={getPnLColor(
                  (filteredOrders as ClosedOrderI[]).reduce((sum, order) => sum + (order.pnl / 100), 0)
                )}
              >
                $
                {(filteredOrders as ClosedOrderI[])
                  .reduce((sum, order) => sum + (order.pnl / 100), 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};