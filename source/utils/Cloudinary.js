import {v2 as cloudinary} from 'cloudinary';
import dotenv from 'dotenv';
import fs from "fs";

dotenv.config({
    path: "./source/.env",
});

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    console.log("localFilePath in cloudinary.js :: " + localFilePath);
    try {
        if(!localFilePath) return null;
        //uploading on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        //successful file upload
        console.log("file uploaded successfully from cloudinary.js file", response);
        fs.unlinkSync(localFilePath) // remove the locally stored file from the server as the upload was unsuccessful
        return response;
    } catch (error) {
        console.log("Error in cloudinary upload in utilitues folder", error);
        fs.unlinkSync(localFilePath) // remove the locally stored file from the server as the upload was unsuccessful
        return null;
    }
}

export { uploadOnCloudinary};