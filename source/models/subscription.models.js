import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
    {
        subscriber: {
            type: mongoose.SchemaType.Types.ObjectId, //subscribing one
            ref: "User"
        },
        channel: {
            type: mongoose.SchemaType.Types.ObjectId, //who is subscribed
            ref: "User"
        },

    },
    {
        timestamps: true
    }
)

export const Subscription = mongoose.model('Subscription', subscriptionSchema);