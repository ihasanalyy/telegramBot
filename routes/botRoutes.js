import express from "express";
import { handleUpdates } from "../controllers/botController.js";

const router = express.Router();

router.post("/webhook" , handleUpdates);

export default router ; 