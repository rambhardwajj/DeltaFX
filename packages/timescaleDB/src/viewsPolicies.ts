import { client } from "./index.js";
const ALL_ASSETS = ["BTC", "SOL", "ETH"]


const intervals = [
  { name: "1minute", start: "1 day", end: "10 seconds", schedule: "40 seconds" },
  { name: "3minutes", start: "1 day", end: "2 minutes", schedule: "1 minute" },
  { name: "5minutes", start: "1 day", end: "3 minutes", schedule: "3 minutes" },
  { name: "10minutes", start: "1 day", end: "5 minutes", schedule: "5 minutes" },
  { name: "15minutes", start: "1 day", end: "5 minutes", schedule: "5 minutes" },
  { name: "30minutes", start: "1 day", end: "5 minutes", schedule: "5 minutes" },
  { name: "1hour", start: "7 days", end: "30 minutes", schedule: "10 minutes" },
  { name: "4hours", start: "30 days", end: "30 minutes", schedule: "30 minutes" },
  { name: "1day", start: "60 days", end: "1 hour", schedule: "1 hour" },
  { name: "1week", start: "180 days", end: "1 day", schedule: "1 day" },
  { name: "1month", start: "365 days", end: "1 day", schedule: "1 day" },
];

async function addPolicies() {
  await client.connect();

  for (const asset of ALL_ASSETS) {
    for (const { name, start, end, schedule } of intervals) {
      const viewName = `${asset}_ohlcv_${name}`;
      const query = `
        SELECT add_continuous_aggregate_policy('${viewName}',
          start_offset => INTERVAL '${start}',
          end_offset => INTERVAL '${end}',
          schedule_interval => INTERVAL '${schedule}'
        );
      `;
      console.log(`Adding policy for ${viewName}`);
      try {
        await client.query(query);
      } catch (err) {
        console.error(`Failed for ${viewName}:`,err);
      }
    }
  }

  await client.end();
  console.log("All policies added!");
}

addPolicies().catch(console.error);
