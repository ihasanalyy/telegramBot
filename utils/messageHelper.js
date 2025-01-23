import axios from "axios";
import { teleGramAPI } from "../config/botConfig.js";

export const sendMessage = async (chatId, text, options) => {
    const payload = {
        chat_id: chatId,
        text,
        ...(options && { reply_markup: options }),
    };
    try {
        await axios.post(`${teleGramAPI}/sendMessage`, payload);
    } catch (error) {
        console.error("Error sending message:", error.response?.data || error.message);
    }
};



export const sendPhoto = async (chatId, photoUrl, caption, options) => {
    const payload = {
        chat_id: chatId,
        photo: photoUrl,
        caption,
        ...(options && { reply_markup: options }),
    };
    try {
        await axios.post(`${teleGramAPI}/sendPhoto`, payload);
    } catch (error) {
        console.error("Error sending photo:", error.response?.data || error.message);
    }
};
