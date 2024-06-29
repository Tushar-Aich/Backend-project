import mongoose from 'mongoose';
import {DB_NAME} from '../constants.js';

const connectDB = async () => {
    try {
        const connectingDB = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MongoDB connected successfully:: ${connectingDB.connection.host}`);
    } catch (error) {
        console.log(`MongoDB connection error in database folder:: ${error}`);
        process.exit(1);
    }
}

export default connectDB;