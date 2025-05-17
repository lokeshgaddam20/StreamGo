import express from "express"
import watchVideo from "../controllers/watch.controller.js";
import getAllVideos from "../controllers/home.controller.js";
import indexVideoData from "../controllers/index.controller.js";
import getVideoSuggestions from "../controllers/suggestions.controller.js";
import syncElasticsearch from '../controllers/sync.controller.js';
import cors from 'cors';

const router = express.Router();

// Enable CORS for all routes
router.use(cors());

router.get('/', watchVideo);
router.get('/home', getAllVideos);
router.get('/suggestions', getVideoSuggestions);
router.post('/index', indexVideoData);

router.post('/admin/sync-elasticsearch', syncElasticsearch);

export default router;