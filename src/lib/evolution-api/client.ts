import axios, { AxiosInstance } from 'axios';
import type {
  CreateInstanceRequest,
  CreateInstanceResponse,
  ConnectInstanceResponse,
  ConnectionStateResponse,
  SendTextMessageRequest,
  SendMediaMessageRequest,
  SendMessageResponse,
  SetWebhookRequest,
  EvolutionApiConfig,
} from './types';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_GLOBAL_API_KEY = process.env.EVOLUTION_GLOBAL_API_KEY || '';

function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function getClient(config?: Partial<EvolutionApiConfig>): AxiosInstance {
  const baseUrl = config?.baseUrl || EVOLUTION_API_URL;
  const apiKey = config?.globalApiKey || EVOLUTION_GLOBAL_API_KEY;

  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
    },
    timeout: 30000,
  });
}

export async function createInstance(
  data: CreateInstanceRequest,
  config?: Partial<EvolutionApiConfig>
): Promise<CreateInstanceResponse> {
  const client = getClient(config);
  try {
    const response = await client.post('/instance/create', {
      instanceName: data.instanceName,
      token: data.token || generateToken(),
      webhook: data.webhookUrl
        ? {
            url: data.webhookUrl,
            webhookByEvent: data.webhookByEvent ?? true,
            events: data.events || [
              'connection.update',
              'messages.upsert',
            ],
          }
        : undefined,
    });
    return response.data;
  } catch (error: any) {
    const detail = error?.response?.data?.response?.message
      || error?.response?.data?.message
      || error?.response?.data?.error
      || error?.message;
    console.error('Evolution API createInstance failed:', JSON.stringify({
      status: error?.response?.status,
      detail,
      requestData: { instanceName: data.instanceName },
    }));
    throw error;
  }
}

export async function connectInstance(
  instanceName: string,
  config?: Partial<EvolutionApiConfig>
): Promise<ConnectInstanceResponse> {
  const client = getClient(config);
  const response = await client.get(`/instance/connect/${instanceName}`);
  return response.data;
}

export async function getConnectionState(
  instanceName: string,
  config?: Partial<EvolutionApiConfig>
): Promise<ConnectionStateResponse> {
  const client = getClient(config);
  const response = await client.get(`/instance/connectionState/${instanceName}`);
  return response.data;
}

export async function sendTextMessage(
  instanceName: string,
  data: SendTextMessageRequest,
  config?: Partial<EvolutionApiConfig>
): Promise<SendMessageResponse> {
  const client = getClient(config);
  const response = await client.post(
    `/message/sendText/${instanceName}`,
    data
  );
  return response.data;
}

export async function sendMediaMessage(
  instanceName: string,
  data: SendMediaMessageRequest,
  config?: Partial<EvolutionApiConfig>
): Promise<SendMessageResponse> {
  const client = getClient(config);
  const response = await client.post(
    `/message/sendMedia/${instanceName}`,
    data
  );
  return response.data;
}

export async function setWebhook(
  instanceName: string,
  data: SetWebhookRequest,
  config?: Partial<EvolutionApiConfig>
): Promise<any> {
  const client = getClient(config);
  const response = await client.post(
    `/instance/setWebhook/${instanceName}`,
    data
  );
  return response.data;
}

export async function logoutInstance(
  instanceName: string,
  config?: Partial<EvolutionApiConfig>
): Promise<any> {
  const client = getClient(config);
  const response = await client.delete(`/instance/logout/${instanceName}`);
  return response.data;
}

export async function deleteInstance(
  instanceName: string,
  config?: Partial<EvolutionApiConfig>
): Promise<any> {
  const client = getClient(config);
  const response = await client.delete(`/instance/deleteInstance/${instanceName}`);
  return response.data;
}

export async function fetchInstances(
  config?: Partial<EvolutionApiConfig>
): Promise<any[]> {
  const client = getClient(config);
  const response = await client.get('/instance/fetchInstances');
  return response.data;
}

export async function checkNumber(
  instanceName: string,
  number: string,
  config?: Partial<EvolutionApiConfig>
): Promise<any> {
  const client = getClient(config);
  const response = await client.post(`/chat/whatsappNumbers/${instanceName}`, {
    numbers: [number],
  });
  return response.data;
}

export { getClient };