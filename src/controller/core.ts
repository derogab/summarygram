import { Context } from "grammy";
import { generate } from '../utils/llm';
import Storage, * as dataUtils from "../utils/data";

/**
 * Generate a key from a chat id.
 * 
 * @param chatId the chat id.
 * @returns the generated key.
 */
function generate_key(chatId: string | number) {
  return `chat:${chatId}`;
}

/**
 * Function to be called when a message is received.
 * 
 * @param storage the storage instance.
 * @param ctx the context of the telegram message.
 */
export async function onMessageReceived(storage: Storage, ctx: Context) {
  // Get the message from the context and extract info.
  const message = ctx.update.message;
  let text = message?.text;
  const chatId = message?.chat?.id ? ''+message?.chat?.id : undefined;
  const fromId = message?.from?.id ? ''+message?.from?.id : undefined;
  const fromUsername = message?.from?.username ? ''+message?.from?.username : undefined;
  const from = fromUsername || fromId;

  // Check if chatId is not available.
  if (!chatId) throw new Error('No Chat found.');
  // Check if from is not available.
  if (!from) throw new Error('No Message Author found.');
  // Check if text is not available.
  if (!text) {
    if (message?.caption) {
      text = message?.caption;
    } else if (message?.document?.file_name) {
      text = message?.document?.file_name;
    } else {
      return;
    }
  }
  // Generate key.
  const key = generate_key(chatId);

  // Check if the message is a special word to execute the summary.
  if (text?.startsWith('/summary')) {
    // Set the bot as typing.
    await ctx.api.sendChatAction(chatId, 'typing').catch(() => {});
    // Get history.
    const history = await dataUtils.getHistory(storage, key);

    // Generate a smart reply using the AI based on instructions and chat history.
    const m = await generate([
      // Instructions for the AI.
      { role: 'system', content: "You are an helpful assistant." },
      { role: 'system', content: "Your only task is to summarize a lot of messages written by different authors." },
      { role: 'system', content: "You will receive all messages of a chat and you will have to return a summary of the all conversation." },
      { role: 'system', content: "Use the same language used by the other people. Reply in simple text WITHOUT any special formatting characters (DO NOT use ** or _ please)." },
      // Chat history.
      ...history.map(x => ({ role: 'user', content: '@' + x.username + ': ' + x.message }))
    ]);

    // Send the message.
    await ctx.reply(m.content as string);

  } else {
    // Save message.
    await dataUtils.updateHistory(storage, key, from, text);
  }
}
