import { ASSETS } from "@repo/config";
import { client } from ".";


const ALL_ASSETS = ["BTC", "SOL", "ETH"]

export async function initDB() {
  try {
    await client.connect();
    await client.query(`CREATE EXTENSION IF NOT EXISTS timescaledb`);
    console.log("in trade.ts");

    for (const asset of ALL_ASSETS) {
        await client.query(`
      CREATE TABLE IF NOT EXISTS ${asset}(
        id SERIAL,
        symbol TEXT NOT NULL,
        price NUMERIC NOT NULL,
        quantity NUMERIC NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (id, timestamp)
      )
  `);

      await client.query(`
        SELECT create_hypertable('${asset}', 'timestamp', if_not_exists => TRUE);
      `);
    }
    console.log("Hypertables created! ");
    await client.end();
  } catch (error) {
    console.error("error", error);
  }
}

initDB().catch(console.error);
