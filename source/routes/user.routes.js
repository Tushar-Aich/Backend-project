import {Router} from 'express';
import {upload} from "../middlewares/multer.middleware.js"
import { loginUser, logoutUser, registerUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUsercoverImage, getUserChannelProfile, getWatchHistory } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route('/register').post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)


//secured Routes
router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-Token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT, changeCurrentPassword)

router.route("/current-user").get(verifyJWT, getCurrentUser)

router.route("/update-Account").patch(verifyJWT, updateAccountDetails)

router.route("/avatar-update").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)

router.route("/coverImage-update").patch(verifyJWT, upload.single("coverImage"), updateUsercoverImage)

router.route("/c/:userName").get(verifyJWT, getUserChannelProfile)

router.route("/history").get(verifyJWT, getWatchHistory)


export default router;