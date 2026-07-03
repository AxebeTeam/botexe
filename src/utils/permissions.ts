import { GuildMember, PermissionFlagsBits } from 'discord.js';
import db from '../database/connection';

export enum PermissionLevel {
  EVERYONE = 0,
  SERVER_MEMBER = 1,
  SERVER_MODERATOR = 2,
  SERVER_ADMIN = 3,
  SERVER_OWNER = 4,
  BOT_OWNER = 5,
}

export const ADMIN_PERMISSION_LABELS: Record<string, string> = {
  limited: '🟢 Limited',
  moderate: '🟡 Moderate',
  full: '🔴 Full',
};

export const ADMIN_PERMISSION_DESCRIPTIONS: Record<string, string> = {
  limited: 'Basic moderation: warn, mute, clear messages',
  moderate: 'Standard admin: kick, ban, manage channels, manage roles',
  full: 'Full access: everything except server ownership transfer',
};

export function getAdminRoleLevel(member: GuildMember): string | null {
  if (!member.guild) return null;
  for (const [roleId] of member.roles.cache) {
    const adminRole = db.prepare('SELECT permission_level FROM admin_roles WHERE guild_id = ? AND role_id = ?').get(member.guild.id, roleId) as any;
    if (adminRole) return adminRole.permission_level;
  }
  return null;
}

export function getPermissionLevel(member: GuildMember): PermissionLevel {
  const ownerId = process.env.OWNER_ID;
  if (member.id === ownerId) return PermissionLevel.BOT_OWNER;
  if (member.id === member.guild.ownerId) return PermissionLevel.SERVER_OWNER;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return PermissionLevel.SERVER_ADMIN;

  const adminLevel = getAdminRoleLevel(member);
  if (adminLevel === 'full') return PermissionLevel.SERVER_ADMIN;
  if (adminLevel === 'moderate') return PermissionLevel.SERVER_ADMIN;
  if (adminLevel === 'limited') return PermissionLevel.SERVER_MODERATOR;
  if (member.permissions.has(PermissionFlagsBits.ModerateMembers)) return PermissionLevel.SERVER_MODERATOR;

  return PermissionLevel.SERVER_MEMBER;
}

export function hasPermission(member: GuildMember, requiredLevel: PermissionLevel): boolean {
  return getPermissionLevel(member) >= requiredLevel;
}

export function isBotOwner(userId: string): boolean {
  return userId === process.env.OWNER_ID;
}

export function checkKeyActive(guildId: string): boolean {
  try {
    const key = db.prepare('SELECT * FROM keys WHERE guild_id = ? AND is_active = 1').get(guildId) as any;
    if (!key) return false;
    if (!key.expires_at) return true;
    const expires = new Date(key.expires_at).getTime();
    return Date.now() < expires;
  } catch {
    return false;
  }
}
