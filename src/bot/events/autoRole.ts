import { Client, GuildMember } from 'discord.js';
import db from '../../database/connection';

export function handleAutoRole(client: Client): void {
  client.on('guildMemberAdd', async (member: GuildMember) => {
    if (member.user.bot) return;

    const roles = db.prepare('SELECT role_id FROM auto_roles WHERE guild_id = ?').all(member.guild.id) as any[];
    if (roles.length === 0) return;

    for (const r of roles) {
      await member.roles.add(r.role_id).catch(() => {});
    }
  });
}
