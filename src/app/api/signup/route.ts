import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import sendWhatsAppNotification  from "@/lib/whatsapp";

export async function POST(request: Request) {
  const ADMIN_PHONE = "2348121751210"; // Admin's phone number
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
        role: "ADMIN",
        email,
        name,
      },
    });

    // Send WhatsApp notification to admin
    const adminMessage = `🌟 New Greenvite Signup!\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nPlease reach out to the lead soon.`;
    await sendWhatsAppNotification(ADMIN_PHONE, adminMessage);

    return NextResponse.json({ 
      success: true, 
      message: "Welcome to Greenvites!" 
    });

  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
