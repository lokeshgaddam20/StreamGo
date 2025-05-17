// kafka/consumer.js
import { Kafka } from "kafkajs";
import fs from "fs";
import path from "path";
import { indexVideo, deleteDocument } from "../elasticsearch/client.js";

const kafka = new Kafka({
  clientId: "watch-service-consumer",
  brokers: ["kafka-33a0a1ee-stream-go.l.aivencloud.com:26833"],
  ssl: {
    ca: [fs.readFileSync(path.resolve("./ca.pem"), "utf-8")]
  },
  sasl: {
    mechanism: "plain",
    username: "avnadmin",
    password: "AVNS_Noc0mzdIrqqAlEugf-l"
  }
});

const topic = "dbserver1.public.videodata"; // Make sure this matches your Debezium config
const groupId = "watch-sync-group";

const consumer = kafka.consumer({ groupId });

export const startKafkaConsumer = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    console.log(`[Kafka] Consumer subscribed to topic: ${topic}`);

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const event = JSON.parse(message.value.toString());
          const { payload } = event;

          if (!payload) return;

          const operation = payload.op;

          if (operation === "c" || operation === "u") {
            const data = payload.after;
            if (data) {
              await indexVideo({
                id: data.id,
                title: data.title,
                description: data.description,
                url: data.url,
                author: data.author,
                createdAt: data.createdat,
              });
              console.log(`[Kafka] Indexed video ID: ${data.id}`);
            }
          } else if (operation === "d") {
            const data = payload.before;
            if (data) {
              await deleteDocument(data.id);
              console.log(`[Kafka] Deleted video ID: ${data.id}`);
            }
          }
        } catch (err) {
          console.error("[Kafka] Error processing message:", err.message);
        }
      }
    });
  } catch (err) {
    console.error("[Kafka] Consumer setup failed:", err);
  }
};
