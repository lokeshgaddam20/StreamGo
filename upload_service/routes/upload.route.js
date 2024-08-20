import express from "express";
import multer from 'multer';
import uploadFileToS3 from "../controllers/upload.controller.js";

const router = express.Router();
const upload = multer();

router.post('/', uploadFileToS3);

export default router;



