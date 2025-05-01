import express from "express"
import watchVideo from "../controllers/watch.controller.js";
import getAllVideos from "../controllers/home.controller.js";
import cors from 'cors';

const router = express.Router();

// Enable CORS for all routes
router.use(cors());

router.get('/', watchVideo);
router.get('/home', getAllVideos);

export default router;
