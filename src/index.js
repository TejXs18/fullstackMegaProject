import dotenv from "dotenv"

import mongoose from "mongoose"
import express from "express"
import connectDB from "./db/index.js";
dotenv.config({
    path:"./env"
})

const app=express()

connectDB()
.then(()=>{
    app.listen(process.env.PORT,()=>{
        console.log(`SERVER STARTED ON PORT ${process.env.PORT}`);
    },
    app.on("error",(error)=>{
        console.log("ERorr : ", error);
        throw error;
    })
)})

.catch((e)=>{
    console.log("Mongo db connection failed : ",e);
    
})


// (async ()=>{
//     try {
//         mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
//         app.on("error",(error)=>{
//             console.log("ERorr : ", error);
//             throw error;
//         })
//         app.listen(process.env.PORT,()=>{
//             console.log(`SERVER STARTED ON PORT ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.log("ERROR : ",error);
        
//     }
// })()