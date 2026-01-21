import  {z} from 'zod';
import { CHAT_TYPE } from './conversation.constant';
// "text":"hey i am new user my name is dragon ",
//     "receiverId":"693875e97bdee96510611a39",
//     "currentSubId":"69371a406b5bb5bc4b5531ae",
//     "chat":"singlechat"

const createConversationGroupSchema=z.object({
    body: z.object({
        groupname: z.string({error:"group name is required"}),
        participants:z.array(z.string({error:"participants is required"})).min(1,{error:"participants min one person is required"}).max(20,{error:"participants max 20 person is required"}),
        currentSubId: z.string({error:"currentSubId is required"}),
       chat: z
      .enum([CHAT_TYPE.groupchat, CHAT_TYPE.singlechat])
      .default(CHAT_TYPE.groupchat)
    })
});

const addedNewUserConversationSchema= z.object({
    body: z.object({
        conversationId:z.string({error:"conversationId is required"}),
        userId: z.string({error:"userId is required"})
    })
})



const ConversationValidation={
    createConversationGroupSchema,
    addedNewUserConversationSchema
};

export default ConversationValidation;