import { Client, GatewayIntentBits, Message, TextChannel, ThreadChannel } from 'discord.js';
import { ChannelAdapter, ChannelMessage } from '../types';
import { DiscordConfig } from './types';

export class DiscordBot implements ChannelAdapter {
  readonly name = 'discord';
  private client: Client;
  private config: DiscordConfig;
  private messageHandler: ((msg: ChannelMessage) => Promise<string>) | null = null;

  constructor(config?: Partial<DiscordConfig>) {
    this.config = {
      token: config?.token ?? process.env.CAM_DISCORD_TOKEN ?? '',
      channelIds: config?.channelIds ?? (process.env.CAM_DISCORD_CHANNEL_ID?.split(',') ?? []),
      guildId: config?.guildId ?? process.env.CAM_DISCORD_GUILD_ID,
      commandPrefix: config?.commandPrefix ?? '!',
    };

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  async connect(): Promise<void> {
    if (!this.config.token) {
      throw new Error('Discord token not configured. Set CAM_DISCORD_TOKEN env var.');
    }

    this.setupListeners();
    await this.client.login(this.config.token);
    console.log(`Discord bot connected as ${this.client.user?.tag}`);
  }

  async disconnect(): Promise<void> {
    this.client.removeAllListeners();
    await this.client.destroy();
    console.log('Discord bot disconnected');
  }

  onMessage(handler: (msg: ChannelMessage) => Promise<string>): void {
    this.messageHandler = handler;
  }

  async sendMessage(channelId: string, content: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }
    if (channel instanceof TextChannel || channel instanceof ThreadChannel) {
      await channel.send(content);
    }
  }

  private setupListeners(): void {
    this.client.on('ready', () => {
      console.log(`Discord bot ready. Watching channels: ${this.config.channelIds.join(', ')}`);
    });

    this.client.on('messageCreate', (message: Message) => {
      this.handleMessage(message).catch((err) => {
        console.error('Error handling Discord message:', err);
      });
    });
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message is in a configured channel
    const channelId = message.channel.id;
    const isInThread = message.channel.isThread();
    const parentId = isInThread ? (message.channel as ThreadChannel).parentId : null;

    const isConfiguredChannel =
      this.config.channelIds.includes(channelId) ||
      (parentId !== null && this.config.channelIds.includes(parentId));

    if (!isConfiguredChannel) return;

    if (!this.messageHandler) return;

    const channelMessage: ChannelMessage = {
      channelId,
      userId: message.author.id,
      userName: message.author.username,
      content: message.content,
      timestamp: message.createdAt,
      metadata: {
        guildId: message.guild?.id,
        isThread: isInThread,
        threadId: isInThread ? channelId : undefined,
      },
    };

    try {
      const response = await this.messageHandler(channelMessage);

      // Reply in thread if message is in a thread, otherwise reply normally
      if (isInThread) {
        await message.reply(response);
      } else {
        await message.reply(response);
      }
    } catch (err) {
      console.error('Error processing Discord message:', err);
    }
  }

  getClient(): Client {
    return this.client;
  }

  getConfig(): DiscordConfig {
    return { ...this.config };
  }
}
