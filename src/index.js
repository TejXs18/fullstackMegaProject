import dotenv from "dotenv"

import mongoose from "mongoose"
import connectDB from "./db/index.js";
import { app } from "./app.js";
dotenv.config({
    path: './.env'
})

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERorr : ", error);
            throw error;
        })
        app.listen(process.env.PORT || 8000, () => {
            console.log(`SERVER STARTED ON PORT ${process.env.PORT}`);
        })
    })
.catch((e)=>{
    console.log("Mongo db connection failed : ",e);
    
});



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