import { Kafka } from "kafkajs";

const KAFKA_TOPICS = ["close", "create", "usd", "balance"];

const kafka = new Kafka({
  clientId: "trading",
  brokers: ["localhost:9092"],
});
const main = async () => {
  const admin = kafka.admin();
  try {
    for (const topic of KAFKA_TOPICS) {
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: 1,
          },
        ],
      });
    }
    await admin.connect();
  } catch (error) {
    console.log(error);
  } finally {
    await admin.disconnect();
  }
};

main();
