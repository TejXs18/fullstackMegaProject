class apiResponse{
    constructor(statusCode,data,message,success=true){
        this.statusCode=statusCode
        this.data=data
        this.message=message
        this.success=statusCode<400
    
    }
}
const {apiResponse}