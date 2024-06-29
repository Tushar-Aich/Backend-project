import mongoose from 'mongoose';
import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/APIerror.js'
import {User} from '../models/user.models.js'
import {uploadOnCloudinary} from '../utils/Cloudinary.js'
import {APIresponse} from '../utils/APIresponse.js';
import jwt from "jsonwebtoken";

const generateAccessandRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while generating refresh and access tokens.", error);
    }
}

const registerUser = asyncHandler( async (req, res) => {
    //------algorithm----------//
    // get user details from frontend
    //validation
    //check if user already exists :: check userName and email
    // check for images :: check for cover image
    // upload them to cloudinary :: avatar check
    // create a user object -- entry in DB
    // remove password(encrypted) and refresh token from response
    // check for user creaion
    // return response
    //------algorithm----------//


    const {fullName, email, userName, password} = req.body
    console.log("req.body", req.body);

    if([fullName, email, userName, password].some((value) => value?.trim() === "")){
        throw new ApiError(400, "All fields are rquired");
    }

    const existingUser = await User.findOne(
        {
            $or: [{userName}, {email}]
        }
    )

    if(existingUser){
        throw new ApiError(409, "User already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }
    console.log("avatar[0] :: ", req.files?.avatar[0]?.path);

    console.log("req.files Here", req.files);
    console.log("local file path of avatar", avatarLocalPath);

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "avatar is required")
    }

    const user = await User.create(
        {
            fullName,
            email,
            userName: userName.toLowerCase(),
            password,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
        }
    )
    console.log(user);
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser) throw new ApiError(500, "something went wrong while creating user")

    return res.status(201).json(
        new APIresponse(200, createdUser, "User created successfully")
    )
} )

const loginUser = asyncHandler(async (req, res) => {
    //todos to implement for logging in user
    //get username or email and password from user
    //check if the user exists
    //check if the data is valid by comparing it with DB
    //compare the given password with the encrypted password
    //generate a refresh and access token
    //keep a copy of refresh token and send access and refresh token to the user
    //get the access token from user and verify it
    //log in the user

    console.log(req.body);
    const {email, password} = req.body

    if(!email) throw new ApiError(400, "email is required");

    const user = await User.findOne({
        $or: [{email}]
    })
    if(!user) throw new ApiError(404, "User not found");

    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if(!isPasswordCorrect) throw new ApiError(401, "Password incorrect");

    const {refreshToken, accessToken} = await generateAccessandRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }
    
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new APIresponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "user logged in successfully"
        )
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1,
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIresponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken) throw new ApiError(401, "unauthorized request");

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
        if(!user) throw new ApiError(401, "invalid refresh Token");
    
        if(incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh token is already used or has expired");
    
        const options = {
            httpOnly: true,
            secure: true,
        }
        const {accessToken, newrefreshToken} = await generateAccessandRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new APIresponse(
                200,
                {
                    accessToken,
                    refreshToken: newrefreshToken
                },
                "Access token refreshed successfully"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect) throw new ApiError(400, "invalid Password");

    user.password = newPassword
    await user.save({validateBeforeAcccess: false})

    return res
    .status(200)
    .json(
        new APIresponse(
            200,
            {
                "oldPassword": oldPassword,
                "newPassword": newPassword
            },
            "password updated successfully"
        )
    )
})

const getCurrentUser = asyncHandler(async (req, res) => {
    console.log(req.user);
    return res
    .status(200)
    .json(
        new APIresponse(200, req.user, "current User fetched successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const {email, userName, fullName} = req.body
    if(!email || !userName || !fullName) throw new ApiError(400, "All fields are required");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                email,
                userName,
                fullName
            }
        }
    ).select("-password")

    return res
    .status(200)
    .json(new APIresponse(200, user, "All fields updated successfully"))
})

const updateUserAvatar = asyncHandler (async (req, res) => {
    const avatarLocalPath = req.file?.path
    console.log("req.file to be found in updateUserAvatar :: ", req.file);
    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url) throw new ApiError(400, "Error hile uploading on cloudinary");

    const updatedavatar = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
    .status(200)
    .json(new APIresponse(200, updatedavatar, "Avatar updated successfully"))
})

const updateUsercoverImage = asyncHandler (async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath) throw new ApiError(400, "coverImage file is missing");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url) throw new ApiError(400, "Error hile uploading on cloudinary");

    const updatedcoverImage = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new APIresponse(200, updatedcoverImage, "coverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {userName} = req.params
    if(!userName?.trim()) throw new ApiError(400, "userName not found");

    const channel = await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" //whom i have subscribed
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }             
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])
    console.log("channel in channel controller in user.controller.js :: ", channel);

    if(!channel?.length) throw new ApiError(200, "channel does not exist");

    return res
    .status(200)
    .json(
        new APIresponse(200, channel[0], "User channel fetched successfully")
    )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            },
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    console.log(user[0].watchHistory);


    return res
    .status(200)
    .json(
        new APIresponse(200, user[0].watchHistory, "Watch History fetched successfully")
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUsercoverImage,
    getUserChannelProfile,
    getWatchHistory
};