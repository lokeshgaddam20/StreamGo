import express from "express";
import { initializeUpload, uploadChunk, completeUpload, uploadToDb } from "../controllers/multipartupload.controller.js";
import multer from 'multer';
const upload = multer();

const router = express.Router();

router.post('/initialize', upload.none(), initializeUpload);

router.post('/', upload.single('chunk'), uploadChunk);

router.post('/complete', completeUpload);

router.post('/uploadToDb', uploadToDb);

export default router;
