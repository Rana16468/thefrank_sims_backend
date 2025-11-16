import httpStatus from "http-status";
import { TErrorSources, TGenericErrorResponse } from "../interface/error";




const handelDuplicateError=(err:any):TGenericErrorResponse=>{

    const match =err.message.match(/"([^"]*)"/);

    // Extracted value or null if not found
    const extractedMessage = match ? match[1] : null;
    const errorSources:TErrorSources=[
        {path:'',message:extractedMessage}
    
    ]


    const statusCode=Number(httpStatus.NOT_FOUND);
    return{
        statusCode,
        message:' InValidate id',
        errorSources 
    }

}

export default handelDuplicateError