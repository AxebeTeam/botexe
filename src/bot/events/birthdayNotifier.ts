import { Client, TextChannel } from 'discord.js';
import db from '../../database/connection';

export function handleBirthdayNotifier(client: Client): void {
  // Check every hour
  setInterval(async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const guilds = client.guilds.cache;
    for (const [, guild] of guilds) {
      const birthdays = db.prepare('SELECT * FROM birthdays WHERE guild_id = ? AND day = ? AND month = ?').all(
        guild.id, now.getDate(), now.getMonth() + 1
      ) as any[];

      if (birthdays.length === 0) continue;

      for (const b of birthdays) {
        // Check if we already announced today
        const key = `birthday_${guild.id}_${b.user_id}_${today}`;
        const already = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
        if (already) continue;

        // Find a suitable channel (system channel or first text channel)
        const channel = guild.systemChannel || guild.channels.cache.find(c => c.type === 0) as TextChannel | undefined;
        if (!channel) continue;

        try {
          await channel.send(`🎂 Happy Birthday <@${b.user_id}>! 🎉🥳`);
          db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, 'true');
        } catch {}
      }
    }
  }, 60 * 60 * 1000); // Every hour
}
