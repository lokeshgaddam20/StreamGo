import { Kafka, Partitioners } from "kafkajs"
import fs from "fs"
import path from "path"

class KafkaConfig {
    constructor() {
        this.kafka = new Kafka({
            clientId: "youtube-uploader",
            brokers: ["kafka-33a0a1ee-stream-go.l.aivencloud.com:26833"],
            ssl: {
                ca: [fs.readFileSync(path.resolve("./ca.pem"), "utf-8")]
            },
            sasl: {
                username: "avnadmin",
                password: "AVNS_Noc0mzdIrqqAlEugf-l",
                mechanism: "plain"
            }
        });

        // Initialize admin first to manage topics
        this.admin = this.kafka.admin();
        
        // Use legacy partitioner to avoid warnings
        this.producer = this.kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner,
            allowAutoTopicCreation: true,
            retry: {
                initialRetryTime: 100,
                retries: 5
            }
        });
    }

    async ensureTopicExists(topic) {
        try {
            await this.admin.connect();
            const topics = await this.admin.listTopics();
            
            if (!topics.includes(topic)) {
                await this.admin.createTopics({
                    waitForLeaders: true,
                    topics: [{
                        topic,
                        numPartitions: 1,
                        replicationFactor: 1,
                        configEntries: [{ name: 'cleanup.policy', value: 'delete' }]
                    }]
                });
                console.log(`Topic ${topic} created successfully`);
            } else {
                console.log(`Topic ${topic} already exists`);
            }
        } finally {
            await this.admin.disconnect();
        }
    }

    async produce(topic, messages) {
        try {
            // Ensure topic exists first
            await this.ensureTopicExists(topic);
            
            // Connect producer
            await this.producer.connect();
            console.log("Kafka producer connected successfully");

            // Send messages
            const result = await this.producer.send({
                topic,
                messages
            });

            console.log(`Messages sent successfully to topic ${topic}:`, result);
            return result;
        } catch (error) {
            console.error('Error in Kafka produce:', error);
            throw error;
        } finally {
            try {
                await this.producer.disconnect();
            } catch (error) {
                console.error('Error disconnecting producer:', error);
            }
        }
    }
}

export default KafkaConfig

