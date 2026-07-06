import { Client, TextChannel, DMChannel, ChannelType } from 'discord.js';
import db from '../../database/connection';

export function handleReminders(client: Client): void {
  setInterval(async () => {
    const now = new Date().toISOString();
    const dueReminders = db.prepare('SELECT * FROM reminders WHERE fired = 0 AND remind_at <= ?').all(now) as any[];

    for (const reminder of dueReminders) {
      try {
        let channel = client.channels.cache.get(reminder.channel_id);
        if (!channel) {
          channel = await client.channels.fetch(reminder.channel_id).catch(() => null);
        }

        if (channel && (channel.type === ChannelType.GuildText || channel.type === ChannelType.DM)) {
          await (channel as TextChannel | DMChannel).send({
            content: `⏰ <@${reminder.user_id}> Reminder: **${reminder.message}**`
          });
        }

        db.prepare('UPDATE reminders SET fired = 1 WHERE id = ?').run(reminder.id);
      } catch {
        db.prepare('UPDATE reminders SET fired = 1 WHERE id = ?').run(reminder.id);
      }
    }
  }, 15000); // Check every 15 seconds
}
