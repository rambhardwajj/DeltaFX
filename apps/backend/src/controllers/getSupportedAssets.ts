import asyncHandler from "../utils/asyncHandler";
import { ASSETS } from "@repo/config";

export const getSupportedAssets = asyncHandler(async (req, res) => {
  const result =  {
    asset: [
      {
        symbol: "BTC",
        name: "Bitcoin",
        imageUrl:
          "https://media.istockphoto.com/id/882085928/vector/blockchain-bitcoin-icon-symbol-vector.jpg?s=612x612&w=0&k=20&c=uv_6f1BKQBRS8UQfz6TZTN2GoOZ--lUHojCpvGvm_4Y=",
      },
      {
        symbol: "SOL",
        name: "Solana",
        imageUrl: "https://cdn-icons-png.freepik.com/512/14446/14446237.png",
      },
      {
        symbol: "ETH",
        name: "Etherium",
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvBLu9P5MVOKzVTHVM7ZgElC0fiCwgybljcg&s",
      },
    ],
  };

  res.status(200)
});
