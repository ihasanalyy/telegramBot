import dotenv from "dotenv"

dotenv.config()

export const teleGramAPI = `https://api.telegram.org/bot${process.env.MY_TOKEN}`
export const webHookURL = process.env.WBHOOK_URL
 