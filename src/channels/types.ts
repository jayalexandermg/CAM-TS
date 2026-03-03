export interface ChannelAdapter {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(handler: (msg: ChannelMessage) => Promise<string>): void;
  sendMessage(channelId: string, content: string): Promise<void>;
}

export interface ChannelMessage {
  channelId: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

export interface ChannelConfig {
  enabled: boolean;
  name: string;
}
