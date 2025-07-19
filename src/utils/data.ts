// Dependencies.
import { createClient, RedisClientType } from 'redis';

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
 * Add a chat to the storage.
 * 
 * @param storage storage instance.
 * @param key the key to add the chat to.
 * @param chatId the chatId to add to the key.
 */
export async function addChat(storage: Storage, key: string, chatId: string) {
  // Connect storage if not connected.
  await storage.connect();
  // Add chatId to the list of chats.
  await storage.client?.sAdd(key, chatId);
}

/**
 * Get chats from the storage.
 * 
 * @param storage storage instance.
 * @param key the key to get the chats from.
 * @returns the list of chats from the key.
 */
export async function getChats(storage: Storage, key: string): Promise<string[]> {
  // Connect storage if not connected.
  await storage.connect();
  // Retrieve the chats.
  return await storage.client?.sMembers(key) || [];
}

/**
 * Get a chat from the storage and remove it from the storage.
 * 
 * @param storage storage instance.
 * @param key the key to get the chat from.
 * @returns a single chat from the key.
 */
export async function getChat(storage: Storage, key: string): Promise<string | null> {
  // Connect storage if not connected.
  await storage.connect();
  // Retrieve one chat.
  const item = await storage.client?.sPop(key, 1);
  // Return the chat.
  return item ? '' + item : null;
}

/**
 * Save a business connection id to the storage.
 * 
 * @param storage storage instance.
 * @param chatId the chatId of the business connection to save.
 */
export async function saveBusinessConnectionId(storage: Storage, chatId: string, businessConnectionId: string) {
  // Connect storage if not connected.
  await storage.connect();
  // Save the business connection id.
  await storage.client?.set('business-connection:' + chatId, businessConnectionId); 
}

/**
 * Get a business connection id from the storage.
 * 
 * @param storage storage instance.
 * @param chatId the chatId of the business connection to get.
 */
export async function getBusinessConnectionId(storage: Storage, chatId: string) : Promise<string | null>{
  // Connect storage if not connected.
  await storage.connect();
  // Save the business connection id.
  return await storage.client?.get('business-connection:' + chatId) || null;
}
