import { createLogger, format, transports  } from "winston";
const { combine, timestamp, json, colorize } = format;

//creating custom format for console log
const consoleLogFormat = format.combine(
    format.colorize(),
    format.printf(({ level, message, timestamp }) => {
        return `${level}: ${message}`;
    })
);

//create a winston logger
const logger = createLogger({
    level: 'info',
    format: combine(
        colorize(),
        timestamp(),
        json()
    ),
    transports: [
        new transports.Console({
            format: consoleLogFormat
        }),
        new transports.File({ filename: 'app.log'})
    ],
});

export default logger;