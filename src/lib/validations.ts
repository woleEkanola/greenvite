import { z } from 'zod'

export const rsvpSubmitSchema = z.object({
  reg_code: z.string().optional(),
  eventId: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  hasDriver: z.boolean().optional(),
  hasGuest: z.boolean().optional(),
  driverName: z.string().optional().or(z.literal('')),
  guestName: z.string().optional().or(z.literal('')),
  driverPhone: z.string().optional().or(z.literal('')),
  guestPhone: z.string().optional().or(z.literal('')),
})

export const eventCreateSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
})

export const inviteSendSchema = z.object({
  recipients: z.array(z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    type: z.enum(['email', 'whatsapp', 'both']),
  })).min(1, 'At least one recipient is required'),
  emailTemplate: z.string().optional(),
  whatsappTemplate: z.string().optional(),
  emailSubject: z.string().optional(),
})

export type RsvpSubmitInput = z.infer<typeof rsvpSubmitSchema>
export type EventCreateInput = z.infer<typeof eventCreateSchema>
export type InviteSendInput = z.infer<typeof inviteSendSchema>
