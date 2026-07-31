// Dependencies.
import { Bot } from "grammy";
import * as dotenv from 'dotenv';
import cron from 'node-cron';

import { onCronJob, onMessageReceived } from './controller/core';

// Configs.
dotenv.config();

// Init bot.
const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN ?? '');

// Add message event listener(s).
bot.on('message', async (ctx) => onMessageReceived(ctx));

// Add cron job listener(s).
const cronSchedule = process.env.CRON_SCHEDULE || '59 23 * * *';
if (cronSchedule !== 'never') cron.schedule(cronSchedule, () => onCronJob(bot));

// Start bot.
bot.start({ allowed_updates: ["message"] });

// Enable graceful stop.
process.once('SIGINT', () => { bot.stop(); });
process.once('SIGTERM', () => { bot.stop(); });
