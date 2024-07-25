import mongoose, {isValidObjectId} from "mongoose"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/APIerror.js"
import {APIresponse} from "../utils/APIresponse.js"
import {Tweet} from "../models/tweet.models.js"
import {User} from "../models/user.models.js"

const createTweet = asyncHandler(async (req, res) => {

    if (!isValidObjectId(req.user?._id)) throw new ApiError(400, "Invalid user ID");

    const user = await User.findById(req.user?._id)
    if(!user) throw new ApiError(400, "Can't post tweet since user doesnot exist");

    const {content} = req.body
    console.log("req.body from tweet controller :: ", req.body);

    if([content].some((value) => value?.trim() === "")){
        throw new ApiError(400, "Content is rquired");
    }

    const tweet = await Tweet.create(
        {
            content,
            owner:user
        }
    )
    console.log(tweet);
    if(!tweet) throw new ApiError(400, "Something went wrong");

    return res
    .status(200)
    .json(
        new APIresponse(200, tweet, "Tweet created successfully")
    )

}) // create tweet done

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!isValidObjectId(userId)) throw new ApiError(400, "invalid user id");

    const user = await User.findById(userId)
    if(!user) throw new ApiError(400, "User not found");

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
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
                //like details
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                createdAt: 1
                //likeCount
                //likedBy
            }
        }
    ])
    if(!tweets) throw new ApiError(400, "Something went wrong while fetching all tweets")

    return res
    .status(200)
    .json(
      new APIresponse(200, tweets, "User tweets fetched successfully")
    )
}); // get all tweets done

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)) throw new ApiError(400, "Tweet was not found");
    const tweet = await Tweet.findById(tweetId);
    if(!tweet) throw new ApiError(400, "Tweet not found");

    const user = await User.findById(req.user?._id)
    if(!user) throw new ApiError(400, "only user can update their tweets");

    if(tweet.owner.toString() !== user._id.toString()) throw new ApiError(400, "only owner update their tweets");

    const {content} = req.body
    if(!content) throw new ApiError(400, "Content cannot be empty");

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            }
        },
        {
            new: true
        }
    )
    console.log("new Tweet :: ", newTweet)

    return res
    .status(200)
    .json(
        new APIresponse(200, newTweet, "Tweet updated successfully")
    )
}) // update tweet by id done

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)) throw new ApiError(400, "Tweet could not be found");
    const tweet = await Tweet.findById(tweetId);
    if(!tweet) throw new ApiError(400, "Tweet not found");

    const user = await User.findById(req.user?._id)
    if(!user) throw new ApiError(400, "only user can delete their tweets");

    if(tweet.owner.toString() !== user._id.toString()) throw new ApiError(400, "only owner delete their tweets");

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId)
    if(!deletedTweet) throw new ApiError(400, "Something went wrong while deleting tweet")

    console.log(deletedTweet)

    return res
    .status(200)
    .json(
        new APIresponse(200, deletedTweet, "Tweet deleted successfully")
    )
}) // delete tweet done

export {createTweet, getUserTweets, updateTweet, deleteTweet}
//tweet part done