import {z} from 'zod';


const secureFolderSchema=z.object({
    body: z.object({
        password: z.string({error:"password is required"}).min(4)
    })
});



const SecureFolderValidation={
    secureFolderSchema
};

export default SecureFolderValidation