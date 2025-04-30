import { Kafka } from "kafkajs"
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
            },
            retry: {
                initialRetryTime: 100,
                retries: 8
            }
        })
        this.producer = this.kafka.producer({
            allowAutoTopicCreation: true,
            transactionTimeout: 30000
        })
        this.consumer = this.kafka.consumer({
            groupId: "youtube-uploader",
            sessionTimeout: 30000
        })
    }

    async produce(topic, messages) {
        try {
            if (!this.producer) {
                throw new Error('Producer not initialized');
            }

            await this.producer.connect()
            console.log("Kafka producer connected successfully")

            const result = await this.producer.send({
                topic: topic,
                messages: messages
            })

            console.log(`Messages sent successfully to topic ${topic}:`, result)
            return result
        } catch (error) {
            console.error('Error in Kafka produce:', error)
            throw error
        } finally {
            try {
                await this.producer.disconnect()
            } catch (error) {
                console.error('Error disconnecting producer:', error)
            }
        }
    }

    async consume(topic, callback) {
        try {
            await this.consumer.connect()
            console.log("Kafka consumer connected successfully")

            await this.consumer.subscribe({
                topic: topic,
                fromBeginning: true
            })

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    try {
                        const value = message.value.toString()
                        await callback(value)
                    } catch (error) {
                        console.error('Error processing message:', error)
                    }
                }
            })
        } catch (error) {
            console.error('Error in Kafka consume:', error)
            throw error
        }
    }

    async disconnect() {
        try {
            await this.consumer.disconnect()
            await this.producer.disconnect()
        } catch (error) {
            console.error('Error disconnecting from Kafka:', error)
        }
    }
}

export default KafkaConfig

