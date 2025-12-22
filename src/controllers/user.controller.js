import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async(userId) => {
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    try {
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, `Token generation failed: ${error.message}`);
    }
};

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
     console.log("logging req.body for study --",req.body);
     
    //  console.log("email : ",email );

     if(
        [fullName,email,password,username].some((field)=>{
            field?.trim()===""})
    )
     {
        throw new ApiError(400,"All fields are required")
     }
    const existedUser = await User.findOne({
        $or: [{ email },{ username }]
    })
    if(existedUser) throw new ApiError(409,"User with email or username already exists")
    
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log("req. files : ",req.files);
    
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    


    if(!avatarLocalPath) throw new ApiError(400,"Avatar is required")
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) throw new ApiError(400,"Avatar upload failed")
    
        const user = await User.create({
            fullName,
            avatar:avatar.url,
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

        return res.status(201).json(
            new apiResponse(201,createdUser,"User registered successfully")
        )

    })

const loginUser = asyncHandler(async (req, res) => {
    //req->data
    //username or email
    //take username and pass and check with the database 
    //generate accesstoken and refresh token 
    //send cookie  
    
    const {email,username,password} = req.body
    if(!username && !email){
        throw new ApiError(400,"Username or email is required")
    }
    
    const user = await User.findOne({
        $or:[{username},{email}]
    })
    if(!user) throw new ApiError(404,"User not found")
    
    const isPasswordValid=await user.isPasswordCorrect(password)
    
    if(!isPasswordValid) throw new ApiError(404,"invalid pass not found")
    
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)
    
    const loggedUser=await User.findById(user._id).select("-password -refreshToken")
    
    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(200,{
            user:loggedUser,accessToken,refreshToken
        },"user logged in successfully")
    )
    

})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken:1
            }
        },
        {
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new apiResponse(200,{},"user logged out successfully")
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken
    
   if(!incomingRefreshToken){
    throw new ApiError(401,"unauthorized request")
   }

 try {
      const decodedToken = jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET,
       
      )
      const user = User.findById(decodedToken?._id)
      if(!user){
       throw new ApiError(401,"Invalid refresh token")
      }
   
      if(incomingRefreshToken!==user?.refreshToken){
       throw new ApiError(401," refresh token expired is used")
      }
   
      const options = {
       httpOnly:true,
       secure:true
      }
      const {accessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
      
      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",newRefreshToken,options)
      .json(
       new apiResponse(
           200,
           {accessToken,refreshToken: newRefreshToken}
       )
      )
 } catch (error) {
    throw new ApiError(401,error?.message||"Invalid refresh token")
 }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new apiResponse(200,{},"password changed successfully"))
    
})

    const getCurrentUser = asyncHandler(async(req,res)=>{
        return res
        .status(200)
        .json(new apiResponse(200,req.user,"current user fethced successfully"))
    })

    const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body

if(!fullName || !email) throw new ApiError(400,"All fields are required")

const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
        $set:{
            fullName,
            email
        }
        
    },
    {new:true}
    ).select("-password -refreshToken")
    
    if(!user) throw new ApiError(404,"User not found")
    
    return res
    .status(200)
    .json(new apiResponse(200,user,"Account details updated successfully"))

    })

    const updateUserAvatar = asyncHandler(async(req,res)=>{
        const avatarLocalPath = req.file?.path

        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar is required")
        }

        const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Avatar upload failed")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new apiResponse(200,user,"Avatar updated successfully"))

    
})

    const updateCoverImage = asyncHandler(async(req,res)=>{
        const coverImageLocalPath = req.file?.path

        if(!coverImageLocalPath){
            throw new ApiError(400,"Avatar is required")
        }

        const avatar = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar.url){
        throw new ApiError(400,"Avatr upload failed")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new apiResponse(200,user,"Cover image updated successfully"))
    
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params

    if(!username?.trim()) throw new ApiError(400,"Username is required")

   const channel = await User.aggregate([
        {
            $match:{
                username : username?.toLowerCase()
            },
        },
        {
                $lookup:{
                    from: "subscriptions",
                    localField : "_id",
                    foreignField:"channel",
                    as:"subscribers"
                }
        },
        {
                $lookup:{
                    from: "subscriptions",
                    localField : "_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
                }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.user?._id,"subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }


   ])
   if(!channel?.length) throw new ApiError(404,"Channel not found")

   return res
   .status(200)
   .json(new apiResponse(200,channel[0],"Channel profile fetched successfully"))
})


const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
    {
        $match:{
            _id:new mongoose.Type.ObjectId(req.user._id)
        }
    },
    {   
        
        $lookup:{
            from:"videos",
            localField:"watchHistroy",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        LocalField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                            {
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }
                        ]
                    }
                },
                {
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }
            ]
            }
    }
    ])

    return res
    .status(200)
    .json(
        new apiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
    
}