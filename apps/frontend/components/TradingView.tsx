"use client";

import axios from "axios";
import { CandlestickSeries, createChart } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

type TradingViewProps = {
  asset: string;
  interval: string;
  limit: number;
};

export default function TradingView({
  asset,
  interval,
  limit,
}: TradingViewProps) {
  const secondContainerRef = useRef(null);
  const [data, setData] = useState({});

  console.log("props", asset, interval, limit);

  useEffect(() => {
    if (secondContainerRef.current) {
      const chartOptions = {
        layout: { textColor: "white", background: { color: "#0C0D10" } },
        grid: {
          horzLines: { color: "#181818" },
          vertLines: { color: "#181818" },
        },
      };
      const secondChart = createChart(secondContainerRef.current, chartOptions);

      const secondSeries = secondChart.addSeries(CandlestickSeries, {
        upColor: "#00B54C", // Bullish body
        wickUpColor: "#88898B", // Bullish wick
        borderUpColor: "#66BB6A", // Bullish border

        downColor: "#E12020", // Bearish body
        wickDownColor: "#88898B", // Bearish wick
        borderDownColor: "#F7525F", // Bearish border

        priceLineVisible: true,
        title: "",
        lastValueVisible: true,
      });

      // api to get the data of the candles from timescaledb
      const fetchData = async (
        asset: string = "BTC",
        interval: string = "1minute",
        limit: number = 100
      ) => {
        try {
          const res = await axios.post(
            `http://localhost:4000/api/v1/candles/get-candles/${asset}/${interval}/${limit}`
          );
          console.log(res.data.data.rows);
          console.log(res.data.data.rows[0].bucket);

          const candles = res.data.data.rows.map(
            (candle: {
              bucket: string;
              open: number;
              high: number;
              low: number;
              close: number;
            }) => ({
              time: Date.parse(candle.bucket) / 1000,
              open: Number(candle.open),
              high: Number(candle.high),
              low: Number(candle.low),
              close: Number(candle.close),
            })
          );

          // console.log("candles", candles);
          secondSeries.setData(candles);
          secondChart.timeScale().fitContent();
        } catch (error) {
          console.log(error);
        }
      };

      fetchData(asset, interval, limit);

      // const refreshInterval = setInterval(() =>{
      //   console.log("fetched data");
      //   fetchData();
      // }, 1000)

      return () => {
        // clearInterval(refreshInterval)
        secondChart.remove();
      };
    }
  }, [asset, interval, limit]);

  return (
    <div>
      <div>
        <div
          ref={secondContainerRef}
          style={{ width: "50vw", height: "30vw" }}
        >
            
        </div>
      </div>
    </div>
  );
}