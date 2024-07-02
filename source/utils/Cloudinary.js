import {v2 as cloudinary} from 'cloudinary';
import dotenv from 'dotenv';
import fs from "fs";
import { ApiError } from './APIerror.js';

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

const deleteFile = async (oldPublic_id) => {
    try {
        const response = await cloudinary.uploader.destroy(oldPublic_id)
        console.log("response of delete function in cloudinary.js file", response);
        return response
    } catch (error) {
        throw new ApiError(400, "Something went wrong while deleting file from cloudinary", [error])
    }
}

export { uploadOnCloudinary, deleteFile};