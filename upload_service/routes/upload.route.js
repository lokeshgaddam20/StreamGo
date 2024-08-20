import express from "express"
//import uploadFileToS3 from "../controllers/upload.controller.js";
import { initializeUpload, uploadChunk, completeUpload } from
"../controllers/multipartupload.controller.js";
import multer from 'multer';
const upload = multer();
const router = express.Router();
// Route for initializing upload
router.post('/initialize', upload.none(), initializeUpload);
// Route for uploading individual chunks
router.post('/', upload.single('chunk'), uploadChunk);
// Route for completing the upload
router.post('/complete', completeUpload);
export default router;