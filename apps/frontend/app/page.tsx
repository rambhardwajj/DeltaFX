"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type WSData = {
  price: number;
  buyPrice: number;
  decimal: number;
  timeStamp: number;
};
type Price = {
  prev: number;
  buyPrice: number;
  price: number;
};
const assetsHm = new Map<string, string>();

assetsHm.set("bookTicker.BTC_USDC", "BTC");
assetsHm.set("bookTicker.SOL_USDC", "SOL");
assetsHm.set("bookTicker.ETH_USDC", "ETH");

const DBASSETS = ["BTC", "SOL", "ETH"];
export default function Home() {
  const router = useRouter();
  const [webSocketConnection, setWebSocketConnection] = useState(false);
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
    function getData() {
      if (!webSocketConnection) {
        const ws = new WebSocket("ws://localhost:8080");
        ws.onopen = (event) => {
          console.log("connected to web socket", event );
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
                  buyPrice:
                    assetData.buyPrice / Math.pow(10, assetData.decimal),
                },
              };
              console.log(currPricesWsRef.current);
            }
          });
        };
      }
    }
    getData();
  }, []);

  return <div className="">

    Hello 
  </div>;
}
