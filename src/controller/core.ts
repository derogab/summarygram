import { Bot, Context } from "grammy";
import { generate } from '@derogab/llm-proxy';
import Storage, * as dataUtils from "../utils/data";

/**
 * Generate a summary of the chat history.
 * 
 * @param storage the storage instance.
 * @param key the key of the chat to generate the summary.
 * @returns the summary.
 */
async function generate_summary(storage: Storage, key: string) {
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

  // Return the summary.
  return m.content as string;
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
  // Check if the chat is whitelisted.
  if (process.env.WHITELISTED_CHATS && !process.env.WHITELISTED_CHATS?.split(',').includes(chatId)) return;
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
  const key = dataUtils.generateKeyChat(chatId);

  // Check if the message is a special word to execute the summary.
  if (text?.startsWith('/summary')) {
    // Set the bot as typing.
    await ctx.api.sendChatAction(chatId, 'typing').catch(() => {});
    // Generate the summary.
    const summary = await generate_summary(storage, key);
    // Send the message.
    await ctx.reply(summary);

  } else {
    // Save message.
    await dataUtils.updateHistory(storage, key, from, text);
    // Check if the message is too long.
    if (text.length > Number(process.env.MSG_LENGTH_LIMIT ?? 1000)) {
      // Generate a smart summary for the message.
      const m = await generate([
        // Instructions for the AI.
        { role: 'system', content: "You are an helpful assistant." },
        { role: 'system', content: "Your only task is to summarize a text." },
        { role: 'system', content: "You will receive the text and you will have to return only a very short and concise summary of that text." },
        { role: 'system', content: "Use the same language used in the text. Reply in simple text WITHOUT any special formatting characters (DO NOT use ** or _ please)." },
        { role: 'system', content: "Use smart spacing so that the text will be easy to read." },
        // Message.
        { role: 'user', content: 'Text:\n\n' + text },
      ]);

      // Send the summarized text.
      await ctx.reply('TL;DR\n\n' + (m.content as string), {
        reply_to_message_id: message?.message_id
      });
    }
  }
}

/**
 * Function to be called when a cron job is triggered.
 * 
 * @param storage the storage instance.
 * @param bot the bot instance.
 */
export async function onCronJob(storage: Storage, bot: Bot) {
  // Get all active chats.
  const chatIds = await dataUtils.getActiveChats(storage);
  // For each chat, generate a summary.
  for (const chatId of chatIds) {
    // Check if the chat has history.
    const history = await dataUtils.getHistory(storage, dataUtils.generateKeyChat(chatId));
    if (history.length === 0) continue;
    // Generate the summary.
    const summary = await generate_summary(storage, dataUtils.generateKeyChat(chatId));
    // Send the message.
    await bot.api.sendMessage(chatId, summary);
  }
}
