// authController.js
import { sendPhoto, sendMessage } from "../utils/messageHelper.js"; // Move helpers to a separate file
export const registerUserCallback = async (req, res) => {
    const { callback_query } = req.body;
    console.log("we are in register")
    const chatId = callback_query.message.chat.id;
    const data = callback_query.data;

    try {
        if (data === "register") {
            const photoUrl = "https://cdn.pixabay.com/photo/2023/01/08/14/22/sample-7705350_640.jpg";
            await sendPhoto(chatId, photoUrl, "Great! Are you signing up as an individual or a business?", {
                inline_keyboard: [
                    [
                        { text: "Individual", callback_data: "register_individual" },
                        { text: "Business", callback_data: "register_business" },
                    ],
                    [{ text: "Back to Menu", callback_data: "back" }],
                ],
            });
        } else if (data === "register_individual") {
            req.app.locals.flows = req.app.locals.flows || {};
            req.app.locals.flows[chatId] = { step: 1, userType: "individual" };
            await sendMessage(chatId, "Please enter your first name:");
        } else if (data === "register_business") {
            const photoBusiness = "https://images.prismic.io/monei/41aa97d5-6257-4453-b008-62b8938d65e3_Instant_Payments.jpeg";
            await sendPhoto(chatId, photoBusiness, "Business account registration will come soon.", {
                inline_keyboard: [[{ text: "Back", callback_data: "back" }]],
            });
        } else if (data === "back") {
            const photoBusiness = "https://www.everee.com/wp-content/uploads/2022/07/1489157_EmailBanner-NewOp2-600x300-300ppi_102822.png";
            await sendPhoto(chatId, photoBusiness, "Hello, how may I help you?", {
                inline_keyboard: [
                    [
                        { text: "Connect Account", callback_data: "connect" },
                        { text: "Register Account", callback_data: "register" },
                    ],
                    [{ text: "Change Language", callback_data: "change_language" }],
                ],
            });
        }

        // res.sendStatus(200);
    } catch (error) {
        console.error("Error handling registration callback:", error.message);
        // res.status(500).send("Internal server error");
    }
};

export const registerUser = async (req, res) => {
    // Logic for handling individual registration data submission
    res.status(200).send("User registered successfully!");
};
