import bcrypt from 'bcrypt';
import axios from "axios";
import { teleGramAPI } from "../config/botConfig.js";
import User from "../models/user.js"; // Import User model

// Helper to send messages
const sendMessage = async (chatId, text, options) => {
    const payload = {
        chat_id: chatId,
        text: text,
        ...(options && { reply_markup: options }),
    };
    try {
        const response = await axios.post(`${teleGramAPI}/sendMessage`, payload);
        console.log("Message sent successfully:", response.data);
    } catch (error) {
        console.error("Error sending message:", error.response?.data || error.message);
    }
};

// Helper to send photos
const sendPhoto = async (chatId, photoUrl, caption, options) => {
    const payload = {
        chat_id: chatId,
        photo: photoUrl,
        caption: caption,
        ...(options && { reply_markup: options }),
    };
    try {
        const response = await axios.post(`${teleGramAPI}/sendPhoto`, payload);
        console.log("Photo sent successfully:", response.data);
    } catch (error) {
        console.error("Error sending photo:", error.response?.data || error.message);
    }
};
export const handleUpdates = async (req, res) => {
    const { message, callback_query } = req.body;
    console.log("Telegram Update Received:", req.body);

    if (callback_query) {
        const chatId = callback_query.message.chat.id;
        const data = callback_query.data;

        // if (data === "confirm_continue") {
        //     await sendMessage(chatId, "Thank you for confirming your details! 🎉 Your registration is now complete.");
        //     delete req.app.locals.flows[chatId]; // Clear flow after confirmation
        // }
        if (data === "confirm_continue") {
            const flow = req.app.locals.flows[chatId];
            if (flow && flow.step === 4) {
                await sendMessage(chatId, "Please enter your password:");
            } else {
                await sendMessage(chatId, "Thank you for confirming your details! 🎉 Your registration is now complete.");
                delete req.app.locals.flows[chatId]; // Clear flow after confirmation
            }
        }
        
         else if (data === "modify_details") {
            req.app.locals.flows = req.app.locals.flows || {};
            req.app.locals.flows[chatId] = { step: 1 }; // Reset to step 1
            await sendMessage(chatId, "Let's modify your details. Please enter your first name:");
        } else if (data === "connect") {
            await sendMessage(chatId, "You are now connected.", {
                inline_keyboard: [[{ text: "Back", callback_data: "back" }]],
            });
        } else if (data === "register") {
            const photoUrl = "https://cdn.pixabay.com/photo/2023/01/08/14/22/sample-7705350_640.jpg";
            await sendPhoto(chatId, photoUrl, "Great! Are you signing up as an individual or a business? 🤔✨", {
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
            const photoBusiness = "https://static.vecteezy.com/system/resources/thumbnails/006/209/507/small/of-coming-soon-perfect-for-additional-design-coming-soon-design-etc-vector.jpg";
            await sendPhoto(chatId, photoBusiness, "Business account registration will come soon, stay tuned for more updates.", {
                inline_keyboard: [[{ text: "Back", callback_data: "back" }]],
            });
        } else if (data === "back") {
            await sendMessage(chatId, "Hello, how may I help you?", {
                inline_keyboard: [
                    [
                        { text: "Connect", callback_data: "connect" },
                        { text: "Register", callback_data: "register" },
                    ],
                    [{ text: "Change Language", callback_data: "change_language" }],
                ],
            });
        }
    }

    if (message) {
        const chatId = message.chat.id;
        const text = message.text.trim();
        req.app.locals.flows = req.app.locals.flows || {};
        const flow = req.app.locals.flows[chatId];

        if (text.toLowerCase() === "hello" && !flow) {
            await sendMessage(chatId, "Hello, how may I help you?", {
                inline_keyboard: [
                    [
                        { text: "Connect", callback_data: "connect" },
                        { text: "Register", callback_data: "register" },
                    ],
                    [{ text: "Change Language", callback_data: "change_language" }],
                ],
            });
        }

        if (flow) {
            if (flow.step === 1) {
                flow.firstName = text;
                flow.step = 2;
                await sendMessage(chatId, "Please enter your last name:");
            } else if (flow.step === 2) {
                flow.lastName = text;

                const existingUser = await User.findOne({ chatId: chatId });
                if (existingUser) {
                    await sendMessage(chatId, "It seems you've already registered. Please contact support if this is a mistake.");
                    delete req.app.locals.flows[chatId];
                    return res.sendStatus(200);
                }

                const userData = {
                    chatId: chatId,
                    userType: flow.userType,
                    name: `${flow.firstName} ${flow.lastName}`,
                    firstName: flow.firstName,
                    lastName: flow.lastName,
                };

                try {
                    const newUser = new User(userData);
                    await newUser.save();
                    await sendMessage(chatId, "Thanks! Your information has been saved.");
                    flow.step = 3; // Move to the next step
                    await sendMessage(chatId, "Please type your phone number in international format, including your country code:");
                } catch (error) {
                    console.error("Error saving user:", error.message);
                    await sendMessage(chatId, "Sorry, there was an error saving your information.");
                    delete req.app.locals.flows[chatId];
                }
            } else if (flow.step === 3) {
                const phoneNumber = text;

                try {
                    const user = await User.findOneAndUpdate(
                        { chatId: chatId },
                        { $set: { phoneNumber: phoneNumber } },
                        { new: true }
                    );
                    if (user) {
                        const photoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRey9O8cPfm2sNanVLKjs4IfTdBjKTU9ClsWw&s";
                        const caption = `Here is what we got so far, please review your details:\n\n` +
                            `*First Name*: ${user.firstName}\n` +
                            `*Last Name*: ${user.lastName}\n` +
                            `*Phone*: ${user.phoneNumber}\n\n` +
                            `Does everything look correct?`;
                        flow.step = 4;

                        await sendPhoto(chatId, photoUrl, caption, {
                            inline_keyboard: [
                                [{ text: "Confirm and Continue", callback_data: "confirm_continue" }],
                                [{ text: "Modify Details", callback_data: "modify_details" }],
                                [{ text: "Main Menu", callback_data: "back" }],
                            ],
                        });
                    } else {
                        await sendMessage(chatId, "User not found. Please start the registration again.");
                    }
                } catch (error) {
                    console.error("Error updating phone number:", error.message);
                    await sendMessage(chatId, "Sorry, there was an error saving your phone number.");
                }
            } else if (flow.step === 4) {
                // const password = text;  // The password entered by the user
                console.log("Password received:", text);

                try {
                    const saltRounds = 10;
                    const hashedPassword = await bcrypt.hash(text, saltRounds);
            
                    const user = await User.findOneAndUpdate(
                        { chatId: chatId },
                        { $set: { password: hashedPassword } },
                        { new: true }
                    );
            
                    if (user) {
                        await sendMessage(chatId, "Password set successfully! 🎉", {
                            inline_keyboard: [[{ text: "Continue", callback_data: "confirm_continue" }]],
                        });
                        delete req.app.locals.flows[chatId]; // Clear flow after completion
                    }
                } catch (error) {
                    console.error("Error setting password:", error.message);
                    await sendMessage(chatId, "Sorry, there was an error setting your password.");
                }
            }
            
        }
    }

    res.sendStatus(200);
};

// Handle updates
// export const handleUpdates = async (req, res) => {
//     const { message, callback_query } = req.body;
//     console.log("Telegram Update Received:", req.body);

//     if (callback_query) {
//         const chatId = callback_query.message.chat.id;
//         const data = callback_query.data;

//         if (data === "confirm_continue") {
//             await sendMessage(chatId, "Thank you for confirming your details! 🎉 Your registration is now complete.");
//         } else if (data === "modify_details") {
//             // Reset flow for modifying details
//             req.app.locals.flows = req.app.locals.flows || {};
//             req.app.locals.flows[chatId] = { step: 1 }; // Reset to step 1
//             await sendMessage(chatId, "Let's modify your details. Please enter your first name:");
//         } else if (data === "connect") {
//             await sendMessage(chatId, "You are now connected.", {
//                 inline_keyboard: [[{ text: "Back", callback_data: "back" }]],
//             });
//         } else if (data === "register") {
//             const photoUrl = "https://cdn.pixabay.com/photo/2023/01/08/14/22/sample-7705350_640.jpg";
//             await sendPhoto(chatId, photoUrl, "Great! Are you signing up as an individual or a business? 🤔✨", {
//                 inline_keyboard: [
//                     [
//                         { text: "Individual", callback_data: "register_individual" },
//                         { text: "Business", callback_data: "register_business" },
//                     ],
//                     [{ text: "Back to Menu", callback_data: "back" }],
//                 ],
//             });
//         } else if (data === "register_individual") {
//             await sendMessage(chatId, "Please enter your first name:");
//             req.app.locals.flows = req.app.locals.flows || {};
//             req.app.locals.flows[chatId] = { step: 1, userType: "individual" };
//         } else if (data === "register_business") {
//             const photoBusiness = "https://static.vecteezy.com/system/resources/thumbnails/006/209/507/small/of-coming-soon-perfect-for-additional-design-coming-soon-design-etc-vector.jpg";
//             await sendPhoto(chatId, photoBusiness, "Business account registration will come soon, stay tuned for more updates.", {
//                 inline_keyboard: [[{ text: "Back", callback_data: "back" }]],
//             });
//         } else if (data === "back") {
//             await sendMessage(chatId, "Hello, how may I help you?", {
//                 inline_keyboard: [
//                     [
//                         { text: "Connect", callback_data: "connect" },
//                         { text: "Register", callback_data: "register" },
//                     ],
//                     [{ text: "Change Language", callback_data: "change_language" }],
//                 ],
//             });
//         }
//     }

//     if (message) {
//         const chatId = message.chat.id;
//         const text = message.text.trim();
//         req.app.locals.flows = req.app.locals.flows || {};
//         const flow = req.app.locals.flows[chatId];

//         if (text.toLowerCase() === "hello" && !flow) {
//             await sendMessage(chatId, "Hello, how may I help you?", {
//                 inline_keyboard: [
//                     [
//                         { text: "Connect", callback_data: "connect" },
//                         { text: "Register", callback_data: "register" },
//                     ],
//                     [{ text: "Change Language", callback_data: "change_language" }],
//                 ],
//             });
//         }

//         if (flow) {
//             if (flow.step === 1) {
//                 flow.firstName = text;
//                 flow.step = 2;
//                 await sendMessage(chatId, "Please enter your last name:");
//             } else if (flow.step === 2) {
//                 flow.lastName = text;

//                 const userData = {
//                     chatId: chatId,
//                     userType: flow.userType,
//                     name: `${flow.firstName} ${flow.lastName}`,
//                     firstName: `${flow.firstName}`,
//                     lastName: `${flow.lastName}`,
//                 };

//                 try {
//                     const newUser = new User(userData);
//                     await newUser.save();
//                     await sendMessage(chatId, "Thanks! Your information has been saved.");
//                     flow.step = 3; // Move to next step
//                     await sendMessage(chatId, "Please type your phone number in international format, including your country code:");
//                 } catch (error) {
//                     console.error("Error saving user:", error.message);
//                     if (error.code === 11000) {
//                         await sendMessage(chatId, "It seems you've already registered. Please contact support if this is a mistake.");
//                     } else {
//                         await sendMessage(chatId, "Sorry, there was an error saving your information.");
//                     }
//                     delete req.app.locals.flows[chatId];
//                 }
//             } else if (flow.step === 3) {
//                 const phoneNumber = text;

//                 try {
//                     const user = await User.findOneAndUpdate(
//                         { chatId: chatId },
//                         { $set: { phoneNumber: phoneNumber } },
//                         { new: true }
//                     );
//                     if (user) {
//                         const photoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRey9O8cPfm2sNanVLKjs4IfTdBjKTU9ClsWw&s";
//                         const caption = `Here is what we got so far, please review your details:\n\n` +
//                             `*First Name*: ${user.firstName}\n` +
//                             `*Last Name*: ${user.lastName}\n` +
//                             `*Phone*: ${user.phoneNumber}\n\n` +
//                             `Does everything look correct?`;
//                         flow.step = 4

//                         await sendPhoto(chatId, photoUrl, caption, {
//                             inline_keyboard: [
//                                 [{ text: "Confirm and Continue", callback_data: "confirm_continue" }],
//                                 [{ text: "Modify Details", callback_data: "modify_details" }],
//                                 [{ text: "Main Menu", callback_data: "back" }],
//                             ],
//                         });
//                     } else {
//                         await sendMessage(chatId, "User not found. Please start the registration again.");
//                     }
//                 } catch (error) {
//                     console.error("Error updating phone number:", error.message);
//                     await sendMessage(chatId, "Sorry, there was an error saving your phone number.");
//                 }
//                 delete req.app.locals.flows[chatId]; // Clear flow
//             } else if (flow.step === 4) {
//                 try {
//                     const saltRounds = 7;
//                     const hashedPassword = await bcrypt.hash(text, saltRounds);

//                     const user = await User.findOneAndUpdate(
//                         { chatId: chatId },
//                         { $set: { password: hashedPassword } },
//                         { new: true }
//                     );

//                     if (user) {
//                         await sendMessage(chatId, "Password set successfully! 🎉", {
//                             inline_keyboard: [[{ text: "Continue", callback_data: "confirm_continue" }]],
//                         });
//                     }
//                 }
//             }

//             res.sendStatus(200);
//         }
// 
        // import bcrypt from "bcrypt"; // Import bcrypt for password encryption
        // import axios from "axios";
        // import { teleGramAPI } from "../config/botConfig.js";
        // import User from "../models/user.js"; // Import User model

        // // Helper to send messages
        // const sendMessage = async (chatId, text, options) => {
        //     const payload = {
        //         chat_id: chatId,
        //         text: text,
        //         ...(options && { reply_markup: options }),
        //     };
        //     try {
        //         const response = await axios.post(`${teleGramAPI}/sendMessage`, payload);
        //         console.log("Message sent successfully:", response.data);
        //     } catch (error) {
        //         console.error("Error sending message:", error.response?.data || error.message);
        //     }
        // };

        // // Helper to send photos
        // const sendPhoto = async (chatId, photoUrl, caption, options) => {
        //     const payload = {
        //         chat_id: chatId,
        //         photo: photoUrl,
        //         caption: caption,
        //         ...(options && { reply_markup: options }),
        //     };
        //     try {
        //         const response = await axios.post(`${teleGramAPI}/sendPhoto`, payload);
        //         console.log("Photo sent successfully:", response.data);
        //     } catch (error) {
        //         console.error("Error sending photo:", error.response?.data || error.message);
        //     }
        // };

        // // Handle updates
        // export const handleUpdates = async (req, res) => {
        //     const { message, callback_query } = req.body;
        //     console.log("Telegram Update Received:", req.body);

        //     if (callback_query) {
        //         const chatId = callback_query.message.chat.id;
        //         const data = callback_query.data;

        //         if (data === "confirm_continue") {
        //             req.app.locals.flows = req.app.locals.flows || {};
        //             req.app.locals.flows[chatId] = { step: 4 }; // Move to password step
        //             await sendMessage(
        //                 chatId,
        //                 "Please set a password for your account. Make sure it's strong and secure!"
        //             );
        //         } else if (data === "modify_details") {
        //             req.app.locals.flows = req.app.locals.flows || {};
        //             req.app.locals.flows[chatId] = { step: 1 }; // Reset to step 1
        //             await sendMessage(chatId, "Let's modify your details. Please enter your first name:");
        //         } else if (data === "connect") {
        //             await sendMessage(chatId, "You are now connected.", {
        //                 inline_keyboard: [[{ text: "Back", callback_data: "back" }]],
        //             });
        //         } else if (data === "register") {
        //             const photoUrl = "https://cdn.pixabay.com/photo/2023/01/08/14/22/sample-7705350_640.jpg";
        //             await sendPhoto(chatId, photoUrl, "Great! Are you signing up as an individual or a business? 🤔✨", {
        //                 inline_keyboard: [
        //                     [
        //                         { text: "Individual", callback_data: "register_individual" },
        //                         { text: "Business", callback_data: "register_business" },
        //                     ],
        //                     [{ text: "Back to Menu", callback_data: "back" }],
        //                 ],
        //             });
        //         } else if (data === "register_individual") {
        //             await sendMessage(chatId, "Please enter your first name:");
        //             req.app.locals.flows = req.app.locals.flows || {};
        //             req.app.locals.flows[chatId] = { step: 1, userType: "individual" };
        //         } else if (data === "register_business") {
        //             const photoBusiness = "https://static.vecteezy.com/system/resources/thumbnails/006/209/507/small/of-coming-soon-perfect-for-additional-design-coming-soon-design-etc-vector.jpg";
        //             await sendPhoto(chatId, photoBusiness, "Business account registration will come soon, stay tuned for more updates.", {
        //                 inline_keyboard: [[{ text: "Back", callback_data: "back" }]],
        //             });
        //         } else if (data === "back") {
        //             await sendMessage(chatId, "Hello, how may I help you?", {
        //                 inline_keyboard: [
        //                     [
        //                         { text: "Connect", callback_data: "connect" },
        //                         { text: "Register", callback_data: "register" },
        //                     ],
        //                     [{ text: "Change Language", callback_data: "change_language" }],
        //                 ],
        //             });
        //         }
        //     }

        //     if (message) {
        //         const chatId = message.chat.id;
        //         const text = message.text.trim();
        //         req.app.locals.flows = req.app.locals.flows || {};
        //         const flow = req.app.locals.flows[chatId];

        //         if (text.toLowerCase() === "hello" && !flow) {
        //             await sendMessage(chatId, "Hello, how may I help you?", {
        //                 inline_keyboard: [
        //                     [
        //                         { text: "Connect", callback_data: "connect" },
        //                         { text: "Register", callback_data: "register" },
        //                     ],
        //                     [{ text: "Change Language", callback_data: "change_language" }],
        //                 ],
        //             });
        //         }

        //         if (flow) {
        //             if (flow.step === 1) {
        //                 flow.firstName = text;
        //                 flow.step = 2;
        //                 await sendMessage(chatId, "Please enter your last name:");
        //             } else if (flow.step === 2) {
        //                 flow.lastName = text;

        //                 const userData = {
        //                     chatId: chatId,
        //                     userType: flow.userType,
        //                     name: `${flow.firstName} ${flow.lastName}`,
        //                     firstName: `${flow.firstName}`,
        //                     lastName: `${flow.lastName}`,
        //                 };

        //                 try {
        //                     const newUser = new User(userData);
        //                     await newUser.save();
        //                     await sendMessage(chatId, "Thanks! Your information has been saved.");
        //                     flow.step = 3; // Move to next step
        //                     await sendMessage(chatId, "Please type your phone number in international format, including your country code:");
        //                 } catch (error) {
        //                     console.error("Error saving user:", error.message);
        //                     if (error.code === 11000) {
        //                         await sendMessage(chatId, "It seems you've already registered. Please contact support if this is a mistake.");
        //                     } else {
        //                         await sendMessage(chatId, "Sorry, there was an error saving your information.");
        //                     }
        //                     delete req.app.locals.flows[chatId];
        //                 }
        //             } else if (flow.step === 3) {
        //                 const phoneNumber = text;

        //                 try {
        //                     const user = await User.findOneAndUpdate(
        //                         { chatId: chatId },
        //                         { $set: { phoneNumber: phoneNumber } },
        //                         { new: true }
        //                     );
        //                     if (user) {
        //                         const photoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRey9O8cPfm2sNanVLKjs4IfTdBjKTU9ClsWw&s";
        //                         const caption = `Here is what we got so far, please review your details:\n\n` +
        //                             `*First Name*: ${user.firstName}\n` +
        //                             `*Last Name*: ${user.lastName}\n` +
        //                             `*Phone*: ${user.phoneNumber}\n\n` +
        //                             `Does everything look correct?`;

        //                         await sendPhoto(chatId, photoUrl, caption, {
        //                             inline_keyboard: [
        //                                 [{ text: "Confirm and Continue", callback_data: "confirm_continue" }],
        //                                 [{ text: "Modify Details", callback_data: "modify_details" }],
        //                                 [{ text: "Main Menu", callback_data: "back" }],
        //                             ],
        //                         });
        //                     } else {
        //                         await sendMessage(chatId, "User not found. Please start the registration again.");
        //                     }
        //                 } catch (error) {
        //                     console.error("Error updating phone number:", error.message);
        //                     await sendMessage(chatId, "Sorry, there was an error saving your phone number.");
        //                 }
        //                 delete req.app.locals.flows[chatId]; // Clear flow
        //             } else if (flow.step === 4) {
        //                 try {
        //                     const saltRounds = 7;
        //                     const hashedPassword = await bcrypt.hash(text, saltRounds);

        //                     const user = await User.findOneAndUpdate(
        //                         { chatId: chatId },
        //                         { $set: { password: hashedPassword } },
        //                         { new: true }
        //                     );

        //                     if (user) {
        //                         await sendMessage(chatId, "Password set successfully! 🎉", {
        //                             inline_keyboard: [[{ text: "Continue", callback_data: "confirm_continue" }]],
        //                         });
        //                     } else {
        //                         await sendMessage(chatId, "User not found. Please start the registration again.");
        //                     }
        //                 } catch (error) {
        //                     console.error("Error setting password:", error.message);
        //                     await sendMessage(chatId, "Sorry, there was an error setting your password.");
        //                 }

        //                 delete req.app.locals.flows[chatId]; // Clear flow
        //             }
        //         }

        //         res.sendStatus(200);
        //     };

    // }