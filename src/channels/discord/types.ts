export interface DiscordConfig {
  token: string;
  channelIds: string[];
  guildId?: string;
  commandPrefix: string; // default '!'
}
