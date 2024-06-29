import mongoose from 'mongoose';
import mongooseAggregatePaginate from 'mongoose-aggregate-paginate-v2';

const videoSchema = new mongoose.Schema(
    {
        videoFile: {
            type: string, //c;oudinary url
            required: true,
        },
        thumbnail: {
            type: string, //c;oudinary url
            required: true,
        },
        title: {
            type: string,
            required: true,
        },
        description: {
            type: string,
            required: true,
        },
        duration: {
            type: Number, //c;oudinary url
            required: true,
        },
        views: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    },
    {
        timestamps: true,
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model('Video', videoSchema);