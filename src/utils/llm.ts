// Dependencies.
import axios from 'axios';
import * as dotenv from 'dotenv';
import { Ollama } from 'ollama';
import OpenAI from 'openai';

// Types.
import type { ChatCompletionMessageParam } from 'openai/resources';
import type { Message } from 'ollama';

export type CloudflareMessage = {
  role: string;
  content: string;
};

export type MessageInputParam = ChatCompletionMessageParam | Message | CloudflareMessage;

// Configs.
dotenv.config();

/**
 * Generate a response from the OpenAI API.
 * 
 * @param messages the messages to be sent to the OpenAI API.
 * @returns the response string from the OpenAI API.
 */
async function generate_openai(messages: ChatCompletionMessageParam[]): Promise<ChatCompletionMessageParam> {
  // Create a new instance of the OpenAI class.
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // Call the OpenAI API.
  const chatCompletion = await openai.chat.completions.create({
    messages: messages,
    model: 'gpt-4o-mini',
  });
  // Return the response.
  return chatCompletion.choices[0].message;
}

/**
 * Generate a response using Ollama Local API.
 * 
 * @param messages the messages to be sent to Ollama.
 * @returns the response string.
 */
async function generate_ollama(messages: Message[]): Promise<Message> {
  // Create a new instance of the OpenAI class.
  const ollama = new Ollama({ host: process.env.OLLAMA_URI || 'http://localhost:11434' });
  // Call the Ollama API.
  const response = await ollama.chat({
    model: process.env.OLLAMA_MODEL || 'llama3.1',
    messages: messages,
  });
  // Return the response.
  return response['message'];
}

/**
 * Generate a response using Cloudflare AI API.
 * 
 * @param messages the messages to be sent to Cloudflare AI.
 * @returns the response string.
 */
async function generate_cloudflare(messages: CloudflareMessage[]): Promise<CloudflareMessage> {
  // Generate API URL based on the environment variables.
  const model_url = 'https://api.cloudflare.com/client/v4/accounts/' + process.env.CLOUDFLARE_ACCOUNT_ID + '/ai/run/' + process.env.CLOUDFLARE_MODEL;
  // Call the Cloudflare AI API.
  const response = await axios({
    method: 'post',
    url: model_url,
    headers: {
      'Authorization': 'Bearer ' + process.env.CLOUDFLARE_AUTH_KEY,
      'Content-Type' : 'application/json',
    }, 
    data: {
      messages: messages,
    },
  });
  // Extract the response message.
  const msg = response.data.success ? response.data.result.response : '';
  // Return the response.
  return { role: 'assistant', content: msg };
}

/**
 * Generate a response using an LLM.
 * 
 * @param messages the messages to be sent to the LLM.
 * @returns the response string.
 */
export async function generate(messages: MessageInputParam[]): Promise<MessageInputParam> {
  // Check what LLM to use, based on the environment variables.
  if (process.env.OPENAI_API_KEY) {
    // If openai key is available, use openai.
    return await generate_openai(messages as ChatCompletionMessageParam[]);
  
  } else if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AUTH_KEY && process.env.CLOUDFLARE_MODEL) {
    // If cloudflare keys are available, use cloudflare.
    return await generate_cloudflare(messages as CloudflareMessage[]);

  } else if (process.env.OLLAMA_URI) {
    // If ollama is available, use ollama.
    return await generate_ollama(messages as Message[]);

  } else {
    // Throw an error if no LLM is available.
    throw new Error('No available LLM found.');
  }
}
