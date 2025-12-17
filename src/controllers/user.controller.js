import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/uploadOnCloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"


const registerUser = asyncHandler(async (req,res)=>{
     //get user details form frontend
     //validation -not empty
     //chec if the user already exits
     //check for images , check avatar 
     //upload them to cloudinary,avatar
     //create user object - create enetry in db
     //remove password and refesh token filed from res
     //check for user creation
     // return res


     const {fullName,email,password,username} = req.body
     console.log("email : ",email );

     if(
        [fullName,email,password,username].some((field)=>{
            field?.trim()===""})
    )
     {
        throw new ApiError(400,"All fields are required")
     }
    const existedUser = User.findOne({
        $or: [{ email },{ username }]
    })
    if(existedUser) throw new ApiError(409,"User with email or username already exists")
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) throw new ApiError(400,"Avatar is required")
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400,"Avatar upload failed")
    
        const user = await User.create({
            fullName,
            avatr:avatar.url,
            coverImage:coverImage?.url ||"",
            email,
            password,
            username:username.toLowerCase()
        })

        const createdUser =await User.findById(user._id).select(
            "-password -refreshToken"
        )
        if(!createdUser){
            throw new ApiError(500,"User registration failed")
        }

    })
    return res.status(201).json(
        new apiResponse(200,createdUser,"User registered successfully")
    )
const loginUser = asyncHandler(async (req, res) => {
    res.status(200).json({
        message: "user logged in successfully"
    })
})

export {
    registerUser,
    loginUser
}