import KafkaConfig from "../kafka/kafka.js";

const sendMessageToKafka = async (req, res) => {
    console.log("Received message for Kafka...");
    try {
        const message = req.body;
        console.log("Message body:", message);
        const kafkaConfig = new KafkaConfig();
        const msgs = [
            {
                key: "video",
                value: JSON.stringify(message)
            }
        ];
        const result = await kafkaConfig.produce("transcode", msgs);
        console.log("Kafka produce result:", result);
        res.status(200).json({ message: "Message sent to Kafka successfully" });
    } catch (error) {
        console.error("Error sending message to Kafka:", error);
        res.status(500).json({ error: error.message });
    }
}

export default sendMessageToKafka;

export const pushVideoForEncodingToKafka = async (title, url) => {
    try {
        const message = {
            title,
            url,
            timestamp: new Date().toISOString()
        };
        console.log("Sending video for encoding:", message);
        const kafkaConfig = new KafkaConfig();
        const msgs = [
            {
                key: "video",
                value: JSON.stringify(message)
            }
        ];
        await kafkaConfig.produce("transcode", msgs);
        console.log("Video sent for encoding successfully");
    } catch (error) {
        console.error("Error sending video for encoding:", error);
        throw error;
    }
};
