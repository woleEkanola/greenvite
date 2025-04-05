export interface MessageTemplate {
  id: string;
  name: string;
  emailSubject: string;
  emailContent: string;
  whatsappContent: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  eventId: string;
  imageUrl?: string;
}
