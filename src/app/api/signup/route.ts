import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import axios from "axios";

// WhatsApp API configuration
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;
const ADMIN_PHONE = "2348121751210"; // Admin's phone number

async function sendWhatsAppNotification(phone: string, message: string): Promise<boolean> {
  try {
    if (!WAAPI_TOKEN || !INSTANCE_ID) {
      console.error('WhatsApp API configuration is incomplete. Token or Instance ID missing.');
      return false;
    }

    const textPayload = {
      chatId: phone + '@c.us',
      message: message
    };

    const response = await axios.post(
      `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-message`,
      textPayload,
      {
        headers: {
          'Authorization': `Bearer ${WAAPI_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    if (response.data?.data?.status === 'success') {
      console.log(`WhatsApp notification sent successfully to ${phone}`);
      return true;
    } else {
      console.error(`Failed to send WhatsApp notification: ${response.data?.data?.message || 'Unknown error'}`);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp notification:', error.message);
    console.error('Error details:', error.response?.data || 'No response data');
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone } = await request.json();

    // Validate input
    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email and phone are required" },
        { status: 400 }
      );
    }

    // Create user with lead role
    const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const user = await prisma.user.create({
      data: {
        username: email,
        password: hashedPassword,
        role: "lead",
        email,
        name,
      },
    });

    // Send WhatsApp notification to admin
    const adminMessage = `🌟 New Greenvite Signup!\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nPlease reach out to the lead soon.`;
    await sendWhatsAppNotification(ADMIN_PHONE, adminMessage);

    return NextResponse.json({ 
      success: true, 
      message: "Your account is being setup. A Greenvite representative will contact you shortly." 
    });

  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
