import KafkaConfig from "../kafka/kafka.js";

const kafkaConfig = new KafkaConfig();

const sendMessageToKafka = async (req, res) => {
    console.log("Received message for Kafka...");
    try {
        const message = req.body;
        console.log("Message body:", message);

        const msgs = [{
            key: "video",
            value: JSON.stringify(message)
        }];

        const result = await kafkaConfig.produce("transcode", msgs);
        console.log("Kafka produce result:", result);
        res.status(200).json({ message: "Message sent to Kafka successfully" });
    } catch (error) {
        console.error("Error sending message to Kafka:", error);
        res.status(500).json({ 
            error: "Failed to send message to processing queue",
            details: error.message
        });
    }
}

export default sendMessageToKafka;

export const pushVideoForEncodingToKafka = async (title, url) => {
    if (!title || !url) {
        throw new Error('Title and URL are required for video encoding');
    }

    try {
        const message = {
            title,
            url,
            timestamp: new Date().toISOString()
        };
        console.log("Sending video for encoding:", message);
        
        const msgs = [{
            key: "video",
            value: JSON.stringify(message)
        }];

        const result = await kafkaConfig.produce("transcode", msgs);
        console.log("Video successfully queued for encoding:", result);
        return result;
    } catch (error) {
        console.error("Error sending video for encoding:", error);
        throw new Error(`Failed to queue video for processing: ${error.message}`);
    }
};
