import mongoose , {Schema} from "mongoose"

const subscriptionSchema = new Schema({
    susbcriber : {
        type:Schema.Types.ObjectId, //one who is subscribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId, // the channel susbcriber is subscribing
        ref:"User"
    }
})

export const Subscription = mongoose.model("Subscription",subscriptionSchema)