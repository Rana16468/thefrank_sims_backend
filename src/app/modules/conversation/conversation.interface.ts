import { Types } from 'mongoose';


export interface IConversation {
  currentSubId:Types.ObjectId
  participants: [Types.ObjectId];
  groupname:String;
  lastMessage: Types.ObjectId | null;
  chat?:"singlechat" | "groupchat"
  isDelete?:Boolean
}
