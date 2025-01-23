import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        // unique: true // Ensure each user is unique
    },
    userType: {
        type: String,
        enum: ['individual', 'business'],
        required: true
    },
    name: {
        type: String,
        required: true
    },
    userName:{
        type : String ,
        // required : true
    },
    firstName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        // required: true
    },
    lastName: {
        type: String,
        required: true
    },
    verifyOtp :{
        type: Boolean,
        default: false
    },
    cityName :{
        type : String ,
        // required : true
    },
    email: {
        type: String,
        // required: true,
        // unique: true // Ensure unique email for individuals
    },
    phoneNumber: {
        type: String,
        // required: true
    },
    businessName: {
        type: String,
        required: function () { return this.userType === 'business'; } // Only required for businesses
    },
    registrationDate: {
        type: Date,
        default: Date.now
    }
});

const User = mongoose.model('User', userSchema);

export default User;