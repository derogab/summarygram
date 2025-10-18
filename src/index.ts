// Dependencies.
import { Bot } from "grammy";
import * as dotenv from 'dotenv';
import cron from 'node-cron';

import Storage from './utils/data';
import { onCronJob, onMessageReceived } from './controller/core';

// Configs.
dotenv.config();

// Init storage.
const storage = new Storage();

// Init bot.
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN ?? '');

// Add message event listener(s).
bot.on('message', async (ctx) => onMessageReceived(storage, ctx));

// Add cron job listener(s).
const cronSchedule = process.env.CRON_SCHEDULE || '59 23 * * *';
if (cronSchedule !== 'never') cron.schedule(cronSchedule, () => onCronJob(storage, bot));

// Start bot.
bot.start({ allowed_updates: ["message"] });

// Enable graceful stop.
process.once('SIGINT', () => { bot.stop(); });
process.once('SIGTERM', () => { bot.stop(); });
