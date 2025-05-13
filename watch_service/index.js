import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import watchRouter from "./routes/watch.route.js"
import { initializeIndex } from "./elasticsearch/client.js"

dotenv.config();

const port = process.env.PORT || 8082;
const app = express();

app.use(cors({
   allowedHeaders: ["*"],
   origin: "*"
}));

app.use(express.json());

app.use('/watch', watchRouter);

app.get('/', (req, res) => {
   res.send('HHLD YouTube Watch Service')
})

const startServer = async () => {
   try {
      await initializeIndex();
      app.listen(port, () => {
         console.log(`Server is listening at http://localhost:${port}`);
      });
   } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
   }
};

startServer();