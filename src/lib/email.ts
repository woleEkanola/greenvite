import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Create reusable transporter object using SMTP transport

export async function sendEmail({ to, subject, html }: EmailOptions) {
  // Send mail with defined transport object


if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
  console.error('SMTP configuration is incomplete. Missing host or port.');
  return false;
}

console.log(`SMTP Config: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER}, Secure=${process.env.SMTP_SECURE}`)

const transportConfig: any = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  tls: {
    rejectUnauthorized: false
  }
};

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transportConfig.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };
} else {
  console.warn('SMTP credentials missing - attempting to send without authentication');
  console.warn('Note: Most SMTP servers require authentication. This will likely fail.');
}

const transport = nodemailer.createTransport(transportConfig);

try {
  await transport.verify();
  console.log('SMTP connection verified successfully');
} catch (verifyError: any) {
  console.error('SMTP connection verification failed:', verifyError);
  console.error('Error details:', verifyError.message);
  
  if (verifyError.code === 'EAUTH') {
    console.error('SMTP authentication failed. Please check your credentials.');
    return false;
  }
  console.log('Attempting to send email anyway despite connection verification failure...');
}

// Use the original image buffer for emails - no resizing
const mailOptions: any = {
  from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Greenvites" <${process.env.SMTP_USER}>` : 'noreply@greenvites.com'),
  to,
  subject,
  html,
}


try {
  const info = await transport.sendMail(mailOptions)
  console.log(`Email sent successfully to ${to}: ${info.messageId}`)
  return info
} catch (sendError: any) {
  console.error(`Failed to send email to ${to}:`, sendError)
  console.error('Send error details:', sendError.message);
  
  if (sendError.response && sendError.response.status === 504) {
    console.log(`Email to ${to} received a 504 error, treating as successful`);
    await prisma.invite.create({
      data: {
        email: to,
        type: 'email',
        status: '504-error',
        errorMessage: '504 Gateway Timeout'
      }
    });
    return true;
  }
  return false
}

}