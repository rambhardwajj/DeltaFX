import { Client } from "pg";
export const INTERVALS = [
  "1 minute",
  "3 minutes",
  "5 minutes",
  "10 minutes",
  "15 minutes",
  "30 minutes",
  "1 hour",
  "4 hours",
  "1 day",
  "1 week",
  "1 month",
];

export const client = new Client({
  connectionString: "postgresql://fomostackpg:pgpassword1010@localhost:5432/fomostack",
});

export async function connectDB() {
  try {
    await client.connect();
    console.log("Database connected ");
  } catch (error) {
    console.error("Database connection error ", error);
    process.exit(1);
  }
}