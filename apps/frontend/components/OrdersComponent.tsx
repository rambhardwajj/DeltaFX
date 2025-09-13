import { useState } from 'react';

interface Order {
  asset: string;
  entryPrice: number;
  id: string;
  leverage: number;
  liquidationPrice: number;
  margin: number;
  quantity: number;
  slippage: number;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  type: 'long' | 'short';
  userId: string;
}

interface OrdersComponentProps {
  orders: Order[];
  history: string;
  setHistory: (value: string) => void;
  currPrices: Record<string, { price: number; buyPrice: number }>;
  onCloseOrder?: (orderId: string) => void;
}

const OrdersComponent: React.FC<OrdersComponentProps> = ({ 
  orders, 
  history, 
  setHistory, 
  currPrices,
  onCloseOrder 
}) => {
  const getAssetSymbol = (fullAsset: string) => {
    if (fullAsset.includes('BTC')) return 'BTC';
    if (fullAsset.includes('SOL')) return 'SOL';
    if (fullAsset.includes('ETH')) return 'ETH';
    return fullAsset;
  };

  const filteredOrders = orders.filter(order => {
    switch (history) {
      case 'OPEN':
        return order.status === 'OPEN';
      case 'Pending':
        return order.status === 'PENDING';
      case 'Closed':
        return order.status === 'CLOSED';
      default:
        return true;
    }
  });

  const calculatePnL = (order: Order) => {
    const assetSymbol = getAssetSymbol(order.asset);
    const currentPrice = currPrices[assetSymbol]?.price || 0;
    
    if (currentPrice === 0) return { pnl: 0, pnlPercentage: 0 };
    
    let pnl = 0;
    if (order.type === 'long') {
      pnl = (currentPrice - ((order.entryPrice)/100)) * order.quantity;
    } else {
      pnl = (((order.entryPrice)/100) - currentPrice) * order.quantity;
    }
    
    const pnlPercentage = (pnl / order.margin) * 100;
    return { pnl, pnlPercentage };
  };

  // Get color based on order type
  const getTypeColor = (type: string) => {
    return type === 'long' ? 'text-green-400' : 'text-red-400';
  };

  // Get P&L color
  const getPnLColor = (pnl: number) => {
    if (pnl > 0) return 'text-green-400';
    if (pnl < 0) return 'text-red-400';
    return 'text-gray-300';
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

      {filteredOrders.length === 0 ? (
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
            <div>Entry Price</div>
            <div>Current Price</div>
            <div>Margin</div>
            <div>Leverage</div>
            <div>P&L</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          {/* Orders */}
          {filteredOrders.map((order) => {
            const assetSymbol = getAssetSymbol(order.asset);
            const currentPrice = currPrices[assetSymbol]?.price || 0;
            const { pnl, pnlPercentage } = calculatePnL(order);

            return (
              <div 
                key={order.id} 
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
                <div className={`font-medium uppercase ${getTypeColor(order.type)}`}>
                  {order.type}
                </div>

                {/* Size (Quantity) */}
                <div className="text-white">
                  {order.quantity.toFixed(6)}
                </div>

                {/* Entry Price */}
                <div className="text-white">
                  ${Number((order.entryPrice)/100).toLocaleString()}
                </div>

                {/* Current Price */}
                <div className="text-white">
                  {currentPrice > 0 ? `$${currentPrice.toLocaleString()}` : '-'}
                </div>

                {/* Margin */}
                <div className="text-white">
                  ${Number(order.margin)/100}
                </div>

                {/* Leverage */}
                <div className="text-white">
                  {order.leverage}x
                </div>

                {/* P&L */}
                <div className={`font-medium ${getPnLColor(pnl)}`}>
                  <div>${pnl.toFixed(2)}</div>
                  <div className="text-xs">
                    ({pnlPercentage > 0 ? '+' : ''}{pnlPercentage.toFixed(2)}%)
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'OPEN' ? 'bg-green-600/20 text-green-400' :
                    order.status === 'PENDING' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-gray-600/20 text-gray-400'
                  }`}>
                    {order.status}
                  </span>
                </div>

                {/* Action */}
                <div>
                  {order.status === 'OPEN' && onCloseOrder && (
                    <button
                      onClick={() => onCloseOrder(order.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary for open positions */}
      {history === 'OPEN' && filteredOrders.length > 0 && (
        <div className="mt-6 p-4 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a]">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Portfolio Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Positions: </span>
              <span className="text-white">{filteredOrders.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Margin: </span>
              <span className="text-white">
                ${Number(filteredOrders.reduce((sum, order) => sum + order.margin, 0))/100}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total P&L: </span>
              <span className={getPnLColor(
                filteredOrders.reduce((sum, order) => {
                  const { pnl } = calculatePnL(order);
                  return sum + pnl;
                }, 0)
              )}>
                ${filteredOrders.reduce((sum, order) => {
                  const { pnl } = calculatePnL(order);
                  return sum + pnl;
                }, 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersComponent;