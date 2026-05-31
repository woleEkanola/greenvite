export type InstanceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CreateInstanceRequest {
  instanceName: string;
  token?: string;
  webhookUrl?: string;
  webhookByEvent?: boolean;
  events?: string[];
}

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    status: InstanceStatus;
    _id: string;
  };
  hash?: string;
  qrCode?: string;
  connection: {
    state: string;
  };
}

export interface ConnectInstanceResponse {
  code: number;
  base64: string;
  instance: string;
  state: string;
}

export interface ConnectionStateResponse {
  instance: {
    instanceName: string;
    state: string;
    status: InstanceStatus;
  };
}

export interface SendTextMessageRequest {
  number: string;
  text: string;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

export interface SendMediaMessageRequest {
  number: string;
  mediatype: 'image' | 'document' | 'audio' | 'video';
  media: string;
  caption?: string;
  fileName?: string;
  delay?: number;
  linkPreview?: boolean;
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

export interface SendMessageResponse {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  messageTimestamp: string;
  status: string;
  ack: number;
}

export interface SetWebhookRequest {
  enabled: boolean;
  url: string;
  webhookByEvent?: boolean;
  events?: string[];
}

export interface EvolutionApiConfig {
  baseUrl: string;
  globalApiKey: string;
}

export interface RateLimitConfig {
  messagesPerMinute: number;
  delayBetweenMs: number;
  maxBurst: number;
}