import { Router } from "express";
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controller.js";

const router = Router()
router.use(verifyJWT); // For applying verification before tweeting to all files

router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router;