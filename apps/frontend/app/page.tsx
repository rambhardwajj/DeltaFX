"use client";
import OrdersComponent, { Order } from "@/components/OrdersComponent";
import TradingView from "@/components/TradingView";
import { useUser } from "@/context/UserContext";
import { api } from "@/utils/api";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type WSData = {
  price: number;
  buyPrice: number;
  decimal: number;
  timeStamp: number;
};
export type Price = {
  prev: number;
  buyPrice: number;
  price: number;
};
const assetsHm = new Map<string, string>();
const leverageOptions = [1, 2, 4, 10, 100, 1000];
assetsHm.set("bookTicker.BTC_USDC", "BTC");
assetsHm.set("bookTicker.SOL_USDC", "SOL");
assetsHm.set("bookTicker.ETH_USDC", "ETH");

export const DBASSETS = ["BTC", "SOL", "ETH"];
export default function Home() {
  const router = useRouter();
  const { user, logout } = useUser();
  // console.log(user);
  const [selectedInterval, setSelectedInterval] = useState("1minute");
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [selectedLimit, setSelectedLimit] = useState(100);
  const [history, setHistory] = useState("OPEN");
  const [webSocketConnection, setWebSocketConnection] = useState(false);
  const [useLeverage, setUseLeverage] = useState(false);
  const [leverage, setLeverage] = useState<number>(1);
  const [margin, setMargin] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [slippage, setSlippage] = useState<number>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [render, setRender] = useState(0);

  const [balance, setBalance] = useState<number | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const currPricesWsRef = useRef<Record<string, Price>>(
    DBASSETS.reduce(
      (acc, asset) => {
        acc[asset] = {
          buyPrice: 0,
          price: 0,
          prev: 0,
        };
        return acc;
      },
      {} as Record<string, Price>
    )
  );

  useEffect(() => {
    const interval = setInterval(() => setRender((prev) => prev + 1), 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!webSocketConnection) {
      const ws = new WebSocket("ws://localhost:8080");
      ws.onopen = (event) => {
        // console.log("connected to web socket", event);
        setWebSocketConnection(true);
      };
      ws.onerror = (error) => {
        console.log("web socket connection error", error);
      };
      ws.onmessage = (msg) => {
        // console.log(msg.data);
        const wsData = JSON.parse(msg.data);
        Object.keys(wsData).forEach((fullAssetName) => {
          const shortAssetName = assetsHm.get(fullAssetName);

          if (shortAssetName && wsData[fullAssetName]) {
            const assetData: WSData = wsData[fullAssetName];
            const prevPrice =
              currPricesWsRef.current[shortAssetName]?.price || 0;

            currPricesWsRef.current = {
              ...currPricesWsRef.current,
              [shortAssetName]: {
                prev: prevPrice,
                price: assetData.price / Math.pow(10, assetData.decimal),
                buyPrice: assetData.buyPrice / Math.pow(10, assetData.decimal),
              },
            };
            // console.log(currPricesWsRef.current);
          }
        });
      };
    }
  }, [webSocketConnection]);

  async function handlePlaceOrder() {
    try {
      if (!selected) return alert("Select Long or Short");

      const res = await api.post("/trade/create", {
        asset: selectedAsset,
        type: selected,
        leverage: leverage || 1,
        quantity: Number(quantity),
        margin: Number(margin) || 0,
        slippage: Number(slippage) || null,
      });

      console.log("Order placed:", res.data);
      alert(res.data.message);

      setRender((prev) => prev + 1);
    } catch {
      console.error("Error placing order");
    }
  }

  useEffect(() => {
    async function fetchBalance() {
      try {
        if (!user) return;
        const res = await api.get("/balance");
        setBalance(res.data.data.data.userBalance.USD.balance);
      } catch (err) {
        console.error("Error fetching balance", err);
      }
    }
    async function fetchOrders() {
      try {
        console.log("inside fetch orders");
        if (!user) return;
        const res = await api.get(`/auth/getUser/${user.id}`);
        console.log(res.data.data.data.userOrders);
        setOrders(res.data.data.data.userOrders);
      } catch (err) {
        console.error("Error fetching orders", err);
      }
    }
    fetchOrders();
    fetchBalance();
  }, [user]);

  return (
    <div className="">
      <header className="h-16 bg-[#111111] border-b border-[#1a1a1a] px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <Image src="/image.png" alt="Logo" width={70} height={70} />
          </div>

          <div className="flex items-center gap-3">
            <div className="p-1.5  rounded-lg  transition-colors">
              <Image
                src="/BTC.png"
                alt="BTC"
                width={30}
                height={24}
                className="rounded-full"
              />
            </div>
            <div className="p-1.5 transition-colors">
              <Image
                src="/ETH.png"
                alt="ETH"
                width={24}
                height={24}
                className="rounded-full"
              />
            </div>
            <div className="p-1.5 transition-colors">
              <Image src="/SOL.png" alt="SOL" width={24} height={24} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-pri md:cursor-pointer bg-neutral-800  rounded-md items-center hover:opacity-95 flex  py-1 px-4">
            <span className="text-sm text-gray-400 mr-2">Balance:</span>
            <span className="text-green-100 font-semibold">${balance}</span>
          </div>
          <button className="text-pri md:cursor-pointer bg-neutral-800  rounded-md items-center hover:opacity-95 flex  py-1 px-4">
            Deposit
          </button>
          <div className="w-8 h-8 mx-4  rounded-lg flex items-center justify-center">
            <div className="rounded-full">
              {user && (
                <button
                  className="text-pri md:cursor-pointer bg-neutral-800  rounded-md items-center hover:opacity-95 flex  py-1 px-4"
                  onClick={logout}
                >
                  Logout
                </button>
              )}
              {!user && (
                <button
                  className="text-pri md:cursor-pointer bg-neutral-800  rounded-md items-center hover:opacity-95 flex  py-1 px-4"
                  onClick={() => router.push("/signin")}
                >
                  SignIn
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex h-[calc(100vh-4rem)]">
        <aside className="w-90 bg-[#0f0f0f] border-r border-[#1a1a1a] p-4">
          <div className="space-y-4 mt-10">
            {Object.entries(currPricesWsRef.current).map(
              ([asset, { buyPrice, price, prev }]) => (
                <div
                  key={asset}
                  className="flex items-center justify-between  rounded-sm px-4 py-2 shadow-sm "
                >
                  <div className="w-full">
                    <div className="flex justify-between items-center  ">
                      <span className="font-semibold text-white text-sm">
                        {asset}
                      </span>
                      <img
                        src={`${asset}.png`}
                        alt=""
                        className="rounded-full w-[2vw] "
                      />
                    </div>

                    <div
                      className={` text-center text-sm  flex justify-between ml-2 ${
                        prev < buyPrice ? "text-green-500" : "text-red-400"
                      }`}
                    >
                      <span>Buy:</span>
                      <span>{buyPrice.toFixed(2)}</span>
                    </div>

                    <div
                      className={`text-center  text-sm   font-medium flex justify-between  ml-2 ${
                        price < prev ? "text-green-500" : "text-red-400"
                      }`}
                    >
                      <span>Sell:</span>
                      <span>{price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </aside>

        <div className=" flex flex-col">
          <div className="flex flex-col p-6">
            <div className="mb-3 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400 font-medium">
                  Interval:
                </label>
                <select
                  className="bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors min-w-[80px]"
                  value={selectedInterval}
                  onChange={(e) => setSelectedInterval(e.target.value)}
                >
                  <option value="1minute">1m</option>
                  <option value="5minutes">5m</option>
                  <option value="15minutes">15m</option>
                  <option value="30minutes">30m</option>
                  <option value="1hour">1h</option>
                  <option value="4hours">4h</option>
                  <option value="1day">1d</option>
                  <option value="1week">1w</option>
                  <option value="1month">1M</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-400 font-medium">
                  Asset:
                </label>
                <select
                  className="bg-[#1a1a1a] text-white border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors min-w-[100px]"
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                >
                  <option value="BTC">BTC</option>
                  <option value="SOL">SOL</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>

            <div className="flex gap-6 justify-between h-[500px]">
              <div className="flex-1 bg-[#111111] border border-[#1a1a1a] rounded-xl overflow-hidden">
                <TradingView
                  asset={selectedAsset}
                  interval={selectedInterval}
                  limit={selectedLimit}
                />
              </div>

              <div className="w-80 bg-[#111111] border border-[#1a1a1a] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-6 text-center">
                  Place Order
                </h3>

                <div className="flex mb-6 bg-[#0a0a0a] rounded-lg p-1">
                  <button
                    onClick={() => setSelected("long")}
                    className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all duration-200 ${
                      selected === "long"
                        ? "bg-green-600 text-white shadow-lg"
                        : "text-green-400 hover:bg-green-600/10"
                    }`}
                  >
                    long
                  </button>
                  <button
                    onClick={() => setSelected("short")}
                    className={`flex-1 py-2.5 px-4 rounded-md font-medium transition-all duration-200 ${
                      selected === "short"
                        ? "bg-red-600 text-white shadow-lg"
                        : "text-red-400 hover:bg-red-600/10"
                    }`}
                  >
                    short
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                      Use Leverage
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useLeverage}
                        onChange={() => setUseLeverage(!useLeverage)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#2a2a2a] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {/* Leverage  */}
                  {useLeverage && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-300">
                        Leverage
                      </label>
                      <div className="flex gap-1">
                        {leverageOptions.map((option) => (
                          <button
                            key={option}
                            onClick={() => setLeverage(option)}
                            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                              leverage === option
                                ? "bg-blue-600 text-white border-blue-500 shadow-lg"
                                : "border-[#2a2a2a] text-gray-300 hover:border-[#3a3a3a] hover:bg-[#1a1a1a]"
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Margin  */}
                  <div>
                    <label className={`text-sm font-medium text-gray-300 `}>
                      Margin
                    </label>
                    <input
                      onChange={(e) => {
                        const newMargin = Number(e.target.value);
                        setMargin(newMargin);

                        const currPrice =
                          selected === "long"
                            ? currPricesWsRef.current[selectedAsset].buyPrice
                            : currPricesWsRef.current[selectedAsset].price;

                        if (currPrice > 0) {
                          const qty = newMargin / currPrice;
                          setQuantity(qty);
                        }
                      }}
                      type="number"
                      placeholder="Enter the margin"
                      className={`w-full px-4 py-3 border border-[#2a2a2a] rounded-lg bg-[#0a0a0a] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                    />
                  </div>

                  {/* Quantity  */}
                  <div className="">
                    <label className={`text-sm font-medium text-neutral-700 `}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      disabled={true}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className={`w-full px-4 py-3 border border-[#2a2a2a] rounded-lg bg-[#0a0a0a] text-neutral-400 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors`}
                    />
                  </div>

                  {/* Slippage  */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Slippage
                    </label>
                    <input
                      type="number"
                      placeholder="Enter stop loss price"
                      value={slippage}
                      onChange={(e) => setSlippage(Number(e.target.value))}
                      className="w-full px-4 py-3 border border-[#2a2a2a] rounded-lg bg-[#0a0a0a] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <button
                    className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                      selected === "long"
                        ? "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25"
                        : selected === "short"
                          ? "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25"
                          : "bg-[#2a2a2a] text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!selected}
                    onClick={handlePlaceOrder}
                  >
                    {selected
                      ? `Place ${selected.charAt(0).toUpperCase() + selected.slice(1)} Order`
                      : "Select long or short"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1a1a1a] p-3 mr-10">
            <OrdersComponent
              orders={orders}
              history={history}
              setHistory={setHistory}
              currPrices={currPricesWsRef.current}
              onCloseOrder={(orderId) => {
                // Add your close order logic here
                console.log("Closing order:", orderId);
                // You might want to call an API endpoint to close the order
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
