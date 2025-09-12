import { client, INTERVALS } from ".";

const ALL_ASSETS = ["BTC", "SOL", "ETH"]
async function createMaterializedViews() {
  try {
    await client.connect();

    for (const asset of ALL_ASSETS) {
      for (const interval of INTERVALS) {
        const viewName = `${asset.toLowerCase()}_ohlcv_${interval.replace(/\s+/g, "")}`;
        const query = `
          CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName}
          WITH (timescaledb.continuous) AS
          SELECT
              time_bucket('${interval}', timestamp) AS bucket,
              first(price, timestamp) AS open,
              max(price) AS high,
              min(price) AS low,
              last(price, timestamp) AS close,
              sum(quantity) AS volume,
              count(*) AS trade_count
          FROM ${asset}
          GROUP BY bucket
          WITH NO DATA;
        `;

        console.log(`Creating view: ${viewName}`);
        await client.query(query);
      }
    }

    console.log("All materialized views created!");
  } catch (error) {
    console.error("Error creating views:", error);
  } finally {
    await client.end();
  }
}

createMaterializedViews().catch(console.error) 
