import { getConversationList } from "../../app/helper/getConversationList";



export const handleGetConversations = async (
  currentUserId: string,
  query: Record<string, unknown>,
) => {
  const conversations = await getConversationList(currentUserId, query);

  return conversations;
};
