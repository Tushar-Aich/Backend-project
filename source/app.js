import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'
import logger from './logger.js';
import morgan from 'morgan';

const app = express();

const morganFormat = ':method :url :status :response-time ms';

app.use(morgan(morganFormat, {
    stream: {
        write: (message) => {
            console.log(message);
            console.log("logging message");
            const logObject = {
                method: message.split(' ')[0],
                url: message.split(' ')[1],
                status: message.split(' ')[2],
                responseTime: message.split(' ')[3]
            };
            logger.info(JSON.stringify(logObject));
        }
    }
}))

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true
    })
);

//common middleware
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended: true, limit: "16kb"}));
app.use(express.static("public"));

app.use(cookieParser());

//router import
import userRouter from './routes/user.routes.js';
import tweetRouter from "./routes/tweet.routes.js"



//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)


export default app;