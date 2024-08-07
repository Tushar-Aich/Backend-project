import mongoose, {isValidObjectId} from "mongoose";
import {Video} from "../models/video.models.js";
import {User} from "../models/user.models.js";
import { ApiError } from "../utils/APIerror.js";
import {APIresponse} from "../utils/APIresponse.js"
import { deleteFile, uploadOnCloudinary} from "../utils/Cloudinary.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    if([title, description].some((value) => value?.trim() === "")){
        throw new ApiError(400, "All fields are rquired");
    }

    if(!isValidObjectId(req.user?._id)) throw new ApiError(400, "Invalid User ID");
    const user = await User.findById(req.user?._id)
    if(!user) throw new ApiError(400, "User was not found");

    let videoLocalPath;
    if(req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0){
        videoLocalPath = req.files.videoFile[0].path
    }else{
        throw new ApiError(400, "No video file uploaded");
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    if(!videoFile) throw new ApiError(400, "Something went wrong while uploading file to cloudinary");
    
    let thumbnailLocalPath;
    if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
        thumbnailLocalPath = req.files.thumbnail[0].path
    }else{
        throw new ApiError(400, "No thumbnail file uploaded");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail) throw new ApiError(400, "Something went wrong while uploading file to cloudinary");

    const video = await Video.create(
        {
            title,
            description,
            videoFile: videoFile.url,
            videoPublicId: videoFile.public_id,
            thumbnail: thumbnail.url,
            thumbnailPublicId: thumbnail.public_id,
            owner: user,
            duration: videoFile.duration
        }
    )
    if(!video) throw new ApiError(400, "video create unsuccessful")

    const createdVideo = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            userName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                ownerDetails: {
                    $first: "$ownerDetails"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                videoFile: 1,
                videoPublicId: 1,
                thumbnail: 1,
                thumbnailPublicId: 1,
                title: 1,
                description: 1,
                isPublished: 1,
                ownerDetails: 1,
                views: 1
            }
        }
    ])
    if(!createdVideo) throw new ApiError(400, "problem in aggregation")

    return res
    .status(200)
    .json(
        new APIresponse(200, createdVideo, "Video created successfully")
    )
}) // publishing video done

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if(!isValidObjectId(videoId)) throw new ApiError(400, "Invalid Video ID");
    let video = await Video.findById(videoId)
    if(!video) throw new ApiError(400, "Video not found");
    if(video.isPublished === false) throw new ApiError(400, "Video is not published yet");

    const setViews = await Video.findByIdAndUpdate(
        videoId, 
        {
            $inc: {
                views: 1,
                runValidators: true
            }
        },
        {
            new: true,

        }
    )

    return res
    .status(200)
    .json(
        new APIresponse(200, video, "Video found successfully")
    )
}) // get video by id done

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId} = req.query

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)

    if(!Number.isInteger(pageNum) || !Number.isInteger(limitNum)) throw new ApiError(400, "Invalid queries passed");

    const skip = (pageNum - 1) * limitNum

    let sorting;
    if(sortType === "desc") sorting = -1
    else if(sortType === "asc") sorting = 1
    else throw new ApiError(400, "Invalid queries passed")

    const videos = await Video.aggregate([
        {
            $match:{
                $or: [
                    {
                        title: {
                            $regex: query, // for finding videos according to the queries
                            $options: "i"  // formatching upper and lower case characters
                        },
                    },
                    {
                        owner: new mongoose.Types.ObjectId(userId)
                    },
                    {}
                ]
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                isPublished: 1,
                owner: 1,
                views: 1,
                createdAt: 1
            }
        }
    ])
    .sort({
        [sortBy]: sorting
    })
    .skip(skip)
    .limit(limitNum)


    if(!videos) throw new ApiError(400, "No videos found");

    return res
    .status(200)
    .json(
        new APIresponse(200, videos, "All videos fetched successfully")
    )
}) // get all videos done

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const {title, description} = req.body
    if([title, description].some((value) => value?.trim() === "")){
        throw new ApiError(400, "All fields are rquired");
    }

    const video = await Video.findById(videoId)
    if(!video) throw new ApiError(400, "Invalid video Id");

    const oldThumbnailId = video.thumbnailPublicId

    const user = await User.findById(video.owner)
    if(!user) throw new ApiError(400, "Invalid user");

    if(user?._id.toString() !== video.owner.toString()) throw new ApiError(400, "Only owner can update the video");

    // let thumbnailLocalPath;
    // if(req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0){
    //     thumbnailLocalPath = req.files.thumbnail[0].path
    // }else{
    //     throw new ApiError(400, "No thumbnail file uploaded");
    // }

    // const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    // if(!thumbnail) throw new ApiError(400, "Something went wrong while uploading file to cloudinary");
    //tried to copy paste from publishVideo function but failed so copied from updateAvatar function in user.controller
    //logic build successfully

    const thumbnailLocalPath = req.file?.path
    if(!thumbnailLocalPath) throw new ApiError(400, "thumbnail file is missing");
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail.url) throw new ApiError(400, "Error hile uploading on cloudinary");

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                thumbnail: thumbnail.url,
                thumbnailPublicId: thumbnail.public_id,
                title,
                description
            }
        },
        {
            new: true
        }
    )
    if(!updatedVideo) throw new ApiError(400, "Updation failed");

    if(oldThumbnailId) await deleteFile(oldThumbnailId);

    console.log("updated Video :: ", updatedVideo);

    return res
    .status(200)
    .json(
        new APIresponse(200, updatedVideo, "video Updated Successfully")
    )
}) // update video done

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if(!video) throw new ApiError(404, "Video not found");

    const user = await User.findById(video.owner)
    if(!user) throw new ApiError(400, "user not found");

    if(user?._id.toString() !== video.owner.toString()) throw new ApiError(400, "Only owner can delete the video");

    const deleteVideoFile = await deleteFile(video.videoPublicId)
    const deleteThumbnailFile = await deleteFile(video.thumbnailPublicId)
    const deletedVideo = await Video.findByIdAndDelete(videoId)

    if(!deleteVideoFile || !deleteThumbnailFile || !deletedVideo) throw new ApiError(400, "Something went wrong while deletion",[], "");

    return res
    .status(200)
    .json(
        new APIresponse(200, "Video deleted Successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId);
    if(!video) throw new ApiError(400, "Invalid video ID");

    video.isPublished = !video.isPublished;
    await video.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new APIresponse(200, video, "Video publish status toggled successfully"));
})

export {
    publishAVideo,
    getVideoById,
    getAllVideos,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}