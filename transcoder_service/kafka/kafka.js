import { Kafka } from "kafkajs"
import fs from "fs"
import path from "path"

class KafkaConfig {
    constructor() {
        this.kafka = new Kafka({
            clientId: "youtube-transcoder",  // Changed clientId to reflect this service
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
        
        this.consumer = this.kafka.consumer({ 
            groupId: "transcoder-group",  // Unique group ID for transcoder service
            sessionTimeout: 30000,
            heartbeatInterval: 3000
        });
    }

    async produce(topic, messages){
        try {
            const result = await this.producer.connect()
            console.log("kafka connected... : ", result)
            await this.producer.send({
                topic: topic,
                messages: messages
            })     
        } catch (error) {
            console.log(error)
        }finally{
            await this.producer.disconnect()
        }  
    }

    async consume(topic, callback) {
        try {
            await this.consumer.connect();
            console.log('Kafka consumer connected');
            
            await this.consumer.subscribe({ 
                topic: topic, 
                fromBeginning: false 
            });
            console.log(`Subscribed to topic: ${topic}`);

            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    console.log(`Received message from topic ${topic}`);
                    const value = message.value.toString();
                    await callback(value);
                }
            });
        } catch (error) {
            console.error('Error in Kafka consumer:', error);
            throw error;
        }
    }
}

export default KafkaConfig;

