import { A2AMessage } from './types';

const DEFAULT_MAX_HISTORY = 1000;

export class A2AProtocol {
  private inboxes: Map<string, A2AMessage[]> = new Map();
  private history: A2AMessage[] = [];
  private readonly maxHistory: number;
  private messageCounter = 0;

  constructor(maxHistory: number = DEFAULT_MAX_HISTORY) {
    this.maxHistory = maxHistory;
  }

  registerAgent(agentId: string): void {
    if (!this.inboxes.has(agentId)) {
      this.inboxes.set(agentId, []);
    }
  }

  unregisterAgent(agentId: string): void {
    this.inboxes.delete(agentId);
  }

  sendMessage(msg: A2AMessage): void {
    this.addToHistory(msg);

    const inbox = this.inboxes.get(msg.to);
    if (inbox) {
      inbox.push(msg);
    }
  }

  getMessages(agentId: string): A2AMessage[] {
    const inbox = this.inboxes.get(agentId);
    if (!inbox) return [];

    // Drain the inbox — return and clear
    const messages = [...inbox];
    inbox.length = 0;
    return messages;
  }

  broadcast(from: string, content: string, type: A2AMessage['type'] = 'info'): void {
    for (const agentId of this.inboxes.keys()) {
      if (agentId === from) continue;

      const msg: A2AMessage = {
        id: this.generateId(),
        from,
        to: agentId,
        type,
        content,
        timestamp: new Date(),
      };

      this.sendMessage(msg);
    }
  }

  requestClarification(from: string, to: string, question: string): A2AMessage {
    const msg: A2AMessage = {
      id: this.generateId(),
      from,
      to,
      type: 'clarification',
      content: question,
      timestamp: new Date(),
    };

    this.sendMessage(msg);
    return msg;
  }

  resolveDiscrepancy(agents: string[], issue: string): A2AMessage[] {
    const sent: A2AMessage[] = [];

    for (const agentId of agents) {
      const msg: A2AMessage = {
        id: this.generateId(),
        from: 'system',
        to: agentId,
        type: 'resolution',
        content: issue,
        timestamp: new Date(),
      };

      this.sendMessage(msg);
      sent.push(msg);
    }

    return sent;
  }

  getRegisteredAgents(): string[] {
    return Array.from(this.inboxes.keys());
  }

  getHistory(): A2AMessage[] {
    return [...this.history];
  }

  private addToHistory(msg: A2AMessage): void {
    this.history.push(msg);

    // Trim history if it exceeds max
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  private generateId(): string {
    this.messageCounter++;
    return `msg_${Date.now()}_${this.messageCounter}`;
  }
}
