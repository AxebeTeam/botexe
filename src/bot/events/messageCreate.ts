import { Client, Message, TextChannel } from 'discord.js';
import db from '../../database/connection';

const cooldowns = new Map<string, number>();

export function handleMessageCreate(client: Client): void {
  client.on('messageCreate', async (message: Message) => {
    if (message.author.bot) return;
    if (!message.guildId) return;

    const userId = message.author.id;
    const guildId = message.guildId;
    const now = Date.now();

    const lastMessage = cooldowns.get(userId);
    if (lastMessage && now - lastMessage < 60000) return;

    cooldowns.set(userId, now);

    const earnedXp = Math.floor(Math.random() * 11) + 5;

    const row = db.prepare('SELECT xp, level FROM levels WHERE guild_id = ? AND user_id = ?').get(guildId, userId) as any;

    if (!row) {
      db.prepare('INSERT INTO levels (guild_id, user_id, xp, level) VALUES (?, ?, ?, ?)').run(guildId, userId, earnedXp, 1);
      return;
    }

    let newXp = row.xp + earnedXp;
    let newLevel = row.level;
    let leveledUp = false;

    while (newXp >= newLevel * 100) {
      newXp -= newLevel * 100;
      newLevel++;
      leveledUp = true;
    }

    db.prepare('UPDATE levels SET xp = ?, level = ? WHERE guild_id = ? AND user_id = ?').run(newXp, newLevel, guildId, userId);

    if (leveledUp) {
      const rewards = db.prepare('SELECT role_id FROM level_rewards WHERE guild_id = ? AND level = ?').all(guildId, newLevel) as any[];
      if (rewards.length > 0 && message.guild) {
        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (member) {
          for (const reward of rewards) {
            if (reward.role_id && !member.roles.cache.has(reward.role_id)) {
              await member.roles.add(reward.role_id).catch(() => {});
            }
          }
        }
      }

      const levelUpMessages = [
        `🎉 Congratulations ${message.author}! You've reached level **${newLevel}**!`,
        `⬆️ ${message.author} leveled up to **${newLevel}**! Keep it up!`,
        `🌟 ${message.author} is now level **${newLevel}**! Amazing!`,
        `🔥 ${message.author} advanced to level **${newLevel}**!`,
      ];
      const msg = levelUpMessages[Math.floor(Math.random() * levelUpMessages.length)];
      if (message.channel instanceof TextChannel) {
        await message.channel.send(rewards.length > 0 ? `${msg}\n🎁 You earned ${rewards.length} reward role(s)!` : msg);
      }
    }
  });
}
