import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import sendWhatsAppNotification from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  const ADMIN_PHONE = "2348121751210"; // Admin's phone number
  try {
    const { name, email, phone, password } = await request.json();

    // Validate input
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Name, email, phone, and password are required" },
        { status: 400 }
      );
    }

    // Create user with admin role
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: email,
        password: hashedPassword,
        role: "ADMIN",
        email,
        name,
        phone: phone || null, 
        verified: false,
      },
    });

    // Create verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify/${user.id}`;

    // Send verification email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Welcome to Greenvites!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for signing up with Greenvites. Please verify your account by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify My Account</a>
        </div>
        <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #2e7d32;">${verificationUrl}</p>
        <p>If you didn't create this account, please ignore this email.</p>
        <p>Best regards,<br>The Greenvites Team</p>
      </div>
    `;

    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Greenvites Account",
        html: emailHtml,
      });
      console.log("Verification email sent successfully");
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    // Send verification WhatsApp message
    const whatsappMessage = `🌿 *Welcome to Greenvites!* 🌿\n\nHi ${name},\n\nThank you for signing up. Please verify your account by clicking the link below:\n\n${verificationUrl}\n\nIf you didn't create this account, please ignore this message.\n\nBest regards,\nThe Greenvites Team`;
    
    try {
      await sendWhatsAppNotification(phone, whatsappMessage);
      console.log("Verification WhatsApp message sent successfully");
    } catch (whatsappError) {
      console.error("Failed to send verification WhatsApp message:", whatsappError);
    }

    // Send admin notification
    const adminMessage = `🌟 New Greenvite Signup!\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nPlease reach out to the lead soon.`;
    await sendWhatsAppNotification(ADMIN_PHONE, adminMessage);

    return NextResponse.json({ 
      success: true, 
      message: "Welcome to Greenvites! We've sent verification links to your email and WhatsApp. Please verify your account to continue.",
      verificationUrl: verificationUrl,
      userId: user.id
    });

  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
