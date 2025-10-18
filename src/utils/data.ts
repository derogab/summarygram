// Dependencies.
import { createClient, RedisClientType } from 'redis';

// Constants.
const KEY_PREFIX_CHAT = 'chat:';

// Class for the data storage.
export default class Storage {
  // The client for the Redis database.
  client: RedisClientType | null;

  /**
   * Create a new instance of the Storage class.
   */
  constructor() {
    this.client = null;
  }

  /**
   * Connect to the Redis database.
   */
  async connect() {
    if (this.client) return; // If the client is already connected, return.
    
    const client = await createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries');
            return false;
          }
          console.log(`Redis connection retry ${retries}/10`);
          return Math.min(retries * 100, 3000);
        }
      }
    })
    .on('error', err => console.log('Redis Client Error', err))
    .connect();

    this.client = client as RedisClientType;
  }

  /**
   * Close the connection to the Redis database.
   */
  async disconnect() {
    await this.client?.disconnect();
    this.client = null;
  }

  /**
   * Destroy the Redis database.
   */
  async destroy() {
    await this.client?.flushAll();
    await this.disconnect();
  }
}

/**
 * Generate a key from a chat id.
 * 
 * @param chatId the id of the chat.
 * @returns the generated key for the chat.
 */
export function generateKeyChat(chatId: string | number) : string {
  return KEY_PREFIX_CHAT + chatId;
}

/**
 * Update history in the storage.
 * 
 * @param storage storage instance.
 * @param key the key to update the history.
 * @param username the username of the user who sent the message.
 * @param message the message to update the history with.
 */
export async function updateHistory(storage: Storage, key: string, username: string, message: string) {
  // Connect storage if not connected.
  await storage.connect();
  // Update the history.
  await storage.client?.multi()
    .rPush(key, username + '###' + message)
    .expire(key, 60 * 60 * 8) // Expire in 8 hours.
    .exec();
}

/**
 * Get the history from the storage.
 * 
 * @param storage storage instance.
 * @param key the key to get the history.
 * @returns the history messages and authors.
 */
export async function getHistory(storage: Storage, key: string): Promise<{ username: string, message: string }[]> {
  // Connect storage if not connected.
  await storage.connect();
  // Retrieve the history.
  const history = await storage.client?.lRange(key, 0, -1) || [];
  // Generate the history messages and authors.
  return history.map(msg => {
    const [username, message] = msg.split('###');
    return { username, message };
  });
}

/**
 * Get all active chats from the storage.
 * 
 * @param storage the storage instance.
 * @returns the active chats.
 */
export async function getActiveChats(storage: Storage): Promise<string[]> {
  // Connect storage if not connected.
  await storage.connect();
  // Retrieve the active chats from stored keys with the prefix.
  const chats = await storage.client?.keys(KEY_PREFIX_CHAT + '*') || [];
  // Return the active chats (keys without the prefix).
  return chats.map(key => key.replace(KEY_PREFIX_CHAT, '')); // Remove the prefix from the key.
}
