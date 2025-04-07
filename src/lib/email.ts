import nodemailer from 'nodemailer';
import { prisma } from './prisma';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  imageUrl?: string | null;
}

/**
 * Process template with image placeholder
 * @param template HTML template with optional {{image}} placeholder
 * @param imageUrl URL of the image to insert (if available)
 * @returns Processed HTML and attachments array for nodemailer
 */
function processEmailTemplate(template: string, imageUrl?: string | null): { 
  html: string, 
  attachments: any[] 
} {
  const attachments: any[] = [];
  let processedHtml = template;
  
  // If we have an image URL
  if (imageUrl) {
    // Create a consistent content ID for the image
    const contentId = 'invitation-image';
    
    // Check if the template contains the image placeholder or already has an img tag with our contentId
    if (template.includes('{{image}}')) {
      // Replace the {{image}} placeholder with an img tag referencing the content ID
      processedHtml = template.replace(
        '{{image}}', 
        `<img src="cid:${contentId}" style="max-width: 100%; height: auto;" alt="Invitation Image" />`
      );
    } else if (!template.includes(`cid:${contentId}`)) {
      // If no placeholder and no img tag with our contentId, add the image at the end
      processedHtml = `${template}\n<div style="margin-top: 20px;"><img src="cid:${contentId}" style="max-width: 100%; height: auto;" alt="Invitation Image" /></div>`;
    }
    
    // Add the image as an attachment with the content ID
    attachments.push({
      filename: 'invitation-image.jpg',
      path: imageUrl,
      cid: contentId
    });
    
    console.log(`Added image attachment with CID: ${contentId}`);
  } else {
    // If no image, just remove the placeholder
    processedHtml = template.replace('{{image}}', '');
  }
  
  return { html: processedHtml, attachments };
}

// Create reusable transporter object using SMTP transport
export async function sendEmail({ to, subject, html, attachments = [], imageUrl }: EmailOptions) {
  // Validate email configuration
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    console.error('SMTP configuration is incomplete. Missing host or port.');
    return { success: false, error: 'SMTP_CONFIG_MISSING' };
  }

  console.log(`Email Configuration Status:`, {
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER ? `${process.env.SMTP_USER.substring(0, 3)}...` : undefined,
    smtpPassConfigured: !!process.env.SMTP_PASS,
    smtpSecure: process.env.SMTP_SECURE === 'true',
    environment: process.env.NODE_ENV || 'development',
    publicUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    hasImageUrl: !!imageUrl,
    imageUrlType: imageUrl ? (imageUrl.startsWith('http') ? 'remote' : 'local') : 'none',
    attachmentsCount: attachments.length
  });

  console.log(`SMTP Config: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER}, Secure=${process.env.SMTP_SECURE}`);

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

  // Verify SMTP connection
  try {
    await transport.verify();
    console.log('SMTP connection verified successfully');
  } catch (verifyError: any) {
    console.error('SMTP connection verification failed:', verifyError);
    console.error('Error details:', verifyError.message);
    
    if (verifyError.code === 'EAUTH') {
      console.error('SMTP authentication failed. Please check your credentials.');
      return { success: false, error: 'SMTP_AUTH_FAILED', details: verifyError.message };
    }
    
    if (verifyError.code === 'ECONNREFUSED') {
      console.error('SMTP connection refused. Please check your host and port.');
      return { success: false, error: 'SMTP_CONNECTION_REFUSED', details: verifyError.message };
    }
    
    console.log('Attempting to send email anyway despite connection verification failure...');
  }

  // Process the template to handle the image placeholder
  const { html: processedHtml, attachments: imageAttachments } = processEmailTemplate(html, imageUrl);
  
  // Combine any existing attachments with the image attachment
  const allAttachments = [...attachments, ...imageAttachments];

  // Prepare email options
  const mailOptions: any = {
    from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Greenvites" <${process.env.SMTP_USER}>` : 'noreply@greenvites.com'),
    to,
    subject,
    html: processedHtml,
  };
  
  // Add attachments if we have any
  if (allAttachments.length > 0) {
    mailOptions.attachments = allAttachments;
    console.log(`Email will include ${allAttachments.length} attachments`);
  }

  // Implement retry logic
  const MAX_RETRIES = 3;
  let retryCount = 0;
  let lastError = null;

  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`Attempt ${retryCount + 1} to send email to ${to}`);
      const info = await transport.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (sendError: any) {
      lastError = sendError;
      retryCount++;
      
      console.error(`Failed to send email to ${to} (attempt ${retryCount}/${MAX_RETRIES}):`, sendError.message);
      
      // Special handling for specific error codes
      if (sendError.code === 'ECONNRESET') {
        console.log(`ECONNRESET error encountered. This could be a temporary network issue. Retrying...`);
      } else if (sendError.code === 'ETIMEDOUT') {
        console.log(`ETIMEDOUT error encountered. SMTP server took too long to respond. Retrying...`);
      } else if (sendError.responseCode === 421) {
        console.log(`421 error: Service not available, closing transmission channel. Retrying...`);
      } else if (sendError.response && sendError.response.status === 504) {
        console.log(`Email to ${to} received a 504 error, treating as successful`);
        console.log(`Skipping invite record creation for 504 error. This will be handled by the calling function.`);
        return { success: true, warning: '504_GATEWAY_TIMEOUT' };
      }
      
      // If this is not the last retry, wait before trying again
      if (retryCount < MAX_RETRIES) {
        const delayMs = 1000 * retryCount; // Exponential backoff: 1s, 2s, 3s
        console.log(`Waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed
  console.error(`All ${MAX_RETRIES} attempts to send email to ${to} failed.`);
  if (lastError) {
    console.error('Last error details:', lastError.message);
    if (lastError.response) console.error('Response:', lastError.response);
  }
  
  return { 
    success: false, 
    error: 'MAX_RETRIES_EXCEEDED', 
    details: lastError ? lastError.message : 'Unknown error' 
  };
}