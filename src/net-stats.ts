import type { Observable } from 'rxjs';
import type { NetConnection, NetReceivedMessage, NetSession } from '@hology/core/gameplay';
import { NetMode } from '@hology/core/gameplay';

export type NetQualityStats = {
  pingMs?: number | null;
  packetLoss?: number | null;
  reliablePacketLoss?: number | null;
  source?: 'measured' | 'simulated';
};

export type NetStatsSnapshot = {
  mode: NetMode;
  peers: number;
  queueDepth: number;
  inboundKBps: number;
  outboundKBps: number;
  inboundMessagesPerSecond: number;
  outboundMessagesPerSecond: number;
  inboundMessages: number;
  outboundMessages: number;
  inboundKB: number;
  outboundKB: number;
  pingMs: number | null;
  packetLoss: number | null;
  reliablePacketLoss: number | null;
  qualitySource: 'measured' | 'simulated' | null;
};

export class NetStatsSession implements NetSession {
  private inboundBytes = 0;
  private outboundBytes = 0;
  private inboundMessages = 0;
  private outboundMessages = 0;
  private lastSampleAt = performance.now();
  private lastInboundBytes = 0;
  private lastOutboundBytes = 0;
  private lastInboundMessages = 0;
  private lastOutboundMessages = 0;
  private latestRates = {
    inboundKBps: 0,
    outboundKBps: 0,
    inboundMessagesPerSecond: 0,
    outboundMessagesPerSecond: 0,
  };

  constructor(
    private readonly session: NetSession,
    private readonly getQualityStats: () => NetQualityStats = () => ({})
  ) {}

  get id(): string {
    return this.session.id;
  }

  get mode(): NetMode {
    return this.session.mode;
  }

  get clients(): NetConnection[] {
    return this.session.clients;
  }

  get server(): NetConnection {
    return this.session.server;
  }

  get playerLeft(): Observable<NetConnection> {
    return this.session.playerLeft;
  }

  get playerJoined(): Observable<NetConnection> {
    return this.session.playerJoined;
  }

  reconnect(): void {
    this.session.reconnect();
  }

  disconnect(): void {
    this.session.disconnect();
  }

  sendMessage(receiver: NetConnection, reliable: boolean, buffer: ArrayBufferLike): void {
    this.outboundBytes += buffer.byteLength;
    this.outboundMessages += 1;
    this.session.sendMessage(receiver, reliable, buffer);
  }

  hasMessage(): number {
    return this.session.hasMessage();
  }

  readMessage(): NetReceivedMessage | null {
    const message = this.session.readMessage();
    if (message != null) {
      this.inboundBytes += message.buffer.byteLength;
      this.inboundMessages += 1;
    }
    return message;
  }

  sample(now = performance.now()): NetStatsSnapshot {
    const elapsedSeconds = Math.max((now - this.lastSampleAt) / 1000, 0.001);
    const inboundBytesDelta = this.inboundBytes - this.lastInboundBytes;
    const outboundBytesDelta = this.outboundBytes - this.lastOutboundBytes;
    const inboundMessagesDelta = this.inboundMessages - this.lastInboundMessages;
    const outboundMessagesDelta = this.outboundMessages - this.lastOutboundMessages;

    this.latestRates = {
      inboundKBps: inboundBytesDelta / 1024 / elapsedSeconds,
      outboundKBps: outboundBytesDelta / 1024 / elapsedSeconds,
      inboundMessagesPerSecond: inboundMessagesDelta / elapsedSeconds,
      outboundMessagesPerSecond: outboundMessagesDelta / elapsedSeconds,
    };

    this.lastSampleAt = now;
    this.lastInboundBytes = this.inboundBytes;
    this.lastOutboundBytes = this.outboundBytes;
    this.lastInboundMessages = this.inboundMessages;
    this.lastOutboundMessages = this.outboundMessages;

    return this.snapshot();
  }

  snapshot(): NetStatsSnapshot {
    const quality = this.getQualityStats();
    return {
      mode: this.mode,
      peers: this.mode === NetMode.client ? (this.server == null ? 0 : 1) : this.clients.length,
      queueDepth: this.hasMessage(),
      inboundKBps: this.latestRates.inboundKBps,
      outboundKBps: this.latestRates.outboundKBps,
      inboundMessagesPerSecond: this.latestRates.inboundMessagesPerSecond,
      outboundMessagesPerSecond: this.latestRates.outboundMessagesPerSecond,
      inboundMessages: this.inboundMessages,
      outboundMessages: this.outboundMessages,
      inboundKB: this.inboundBytes / 1024,
      outboundKB: this.outboundBytes / 1024,
      pingMs: quality.pingMs ?? null,
      packetLoss: quality.packetLoss ?? null,
      reliablePacketLoss: quality.reliablePacketLoss ?? null,
      qualitySource: quality.source ?? null,
    };
  }
}

export function modeLabel(mode: NetMode): string {
  switch (mode) {
    case NetMode.none:
      return 'Local';
    case NetMode.dedicatedServer:
      return 'Dedicated';
    case NetMode.listenServer:
      return 'Listen';
    case NetMode.client:
      return 'Client';
    default:
      return `Mode ${mode}`;
  }
}
