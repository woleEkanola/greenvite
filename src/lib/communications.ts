import nodemailer from 'nodemailer';
import axios from 'axios';
import { prisma } from './prisma';

// WhatsApp API configuration
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;

/**
 * Sends a WhatsApp message using the WhatsApp API
 */
export async function sendWhatsApp(phone: string, name: string, code: string, message: string, eventLink: string, imageBuffer?: Buffer, imageUrl?: string): Promise<boolean> {
  // Check if running on Vercel
  const isVercel = process.env.VERCEL === '1';
  
  // Format the phone number (remove any non-numeric characters except the + sign)
  const formattedPhone = phone.replace(/[^\d+]/g, '');
  
  // Format the phone number for WhatsApp API
  // Remove the + sign if present
  const whatsappPhone = formattedPhone.replace(/^\+/, '');
  
  try {
    console.log(`Sending WhatsApp message to ${name} (${phone})`);
    
    if (!WAAPI_TOKEN || !INSTANCE_ID) {
      console.error('WhatsApp API configuration missing');
      return false;
    }
    
    // Replace placeholders in the message
    const formattedMessage = message
      .replace(/\{\{code\}\}/g, code)
      .replace(/\{\{link\}\}/g, eventLink)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{code\}/g, code)
      .replace(/\{link\}/g, eventLink)
      .replace(/\{name\}/g, name)
      .replace(/\{\{\{code\}\}\}/g, code)
      .replace(/\{\{\{link\}\}\}/g, eventLink)
      .replace(/\{\{\{name\}\}\}/g, name);
    
    // Set a reasonable timeout based on environment (shorter for Vercel)
    const timeoutMs = isVercel ? 25000 : 30000; // 25 seconds for Vercel, 30 seconds for other environments
    
    // Check if we need to extract image URL from the message
    let imageUrlFromMessage: string | undefined;
    const imgTagMatch = message.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
    if (imgTagMatch && imgTagMatch[1]) {
      imageUrlFromMessage = imgTagMatch[1];
      console.log(`Found image URL in message: ${imageUrlFromMessage}`);
    }
    
    // Use the provided image URL if available, otherwise use the one from the message
    imageUrl = imageUrl || imageUrlFromMessage;
    
    // Function to fetch image from URL
    const fetchImageFromUrl = async (url: string): Promise<Buffer | null> => {
      try {
        console.log(`Fetching image from URL: ${url}`);
        
        // Add retry logic for image fetching
        const fetchWithRetry = async (attempt = 1, maxAttempts = 3) => {
          try {
            const response = await axios.get(url, { 
              responseType: 'arraybuffer',
              timeout: 15000, // 15 second timeout
              headers: {
                'Accept': 'image/*',
                'Cache-Control': 'no-cache'
              }
            });
            return response.data;
          } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
            if (attempt < maxAttempts) {
              console.log(`Retrying... (${attempt}/${maxAttempts})`);
              // Wait 1 second before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
              return fetchWithRetry(attempt + 1, maxAttempts);
            }
            throw error;
          }
        };
        
        const imageData = await fetchWithRetry();
        return Buffer.from(imageData);
      } catch (error) {
        console.error('Error fetching image from URL:', error);
        return null;
      }
    };
    
    // If we have an image URL but no buffer, try to fetch the image
    if (!imageBuffer && imageUrl) {
      const fetchedBuffer = await fetchImageFromUrl(imageUrl);
      if (fetchedBuffer) {
        imageBuffer = fetchedBuffer;
        console.log(`Successfully fetched image from URL, size: ${imageBuffer.length} bytes`);
      }
    }
    
    let resizedImageBuffer;
    if (imageBuffer) {
      try {
        // Import sharp dynamically to avoid issues with Next.js
        const sharp = (await import('sharp')).default;
        
        resizedImageBuffer = await sharp(imageBuffer)
          .resize({ width: 800 }) // Resize to width of 800px, maintaining aspect ratio
          .jpeg({ quality: 80 }) // Compress as JPEG with 80% quality
          .toBuffer();
        
        console.log(`Original image size: ${imageBuffer.length} bytes, Resized image size: ${resizedImageBuffer.length} bytes`);
      } catch (resizeError) {
        console.error('Error resizing image:', resizeError);
        // Continue without the image if resizing fails
        console.log('Continuing with original image buffer due to resize failure');
        resizedImageBuffer = imageBuffer;
      }
    }

    // Send the media message with caption if we have an image
    if (resizedImageBuffer) {
      try {
        console.log('Sending WhatsApp media message...');
        
        // According to https://waapi.readme.io/reference/post_instances-id-client-action-send-media
        const mediaPayload = {
          chatId: whatsappPhone + '@c.us',
          mediaBase64: resizedImageBuffer.toString('base64'),
          mediaName: 'invitation.jpg',
          mediaCaption: formattedMessage // Use the formatted message with replaced placeholders
        };

        console.log(`Sending media message with base64 image (${resizedImageBuffer.toString('base64').length} chars)`);
        
        const mediaResponse = await axios.post(
          `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-media`, 
          mediaPayload, 
          {
            headers: {
              'Authorization': `Bearer ${WAAPI_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: timeoutMs // Use the environment-specific timeout
          }
        );
        
        console.log('WhatsApp media API response:', mediaResponse.data);
        
        // Check if the message was sent successfully
        const success = mediaResponse.data?.data?.status === 'success';
        
        if (success) {
          console.log(`WhatsApp media message sent successfully to ${whatsappPhone}@c.us`);
        } else {
          console.error(`Failed to send WhatsApp media message to ${whatsappPhone}@c.us:`, mediaResponse.data);
        }
        
        return success;
      } catch (mediaError) {
        // Check if it's a timeout error (504) - treat as success
        if (axios.isAxiosError(mediaError) && (
          mediaError.code === 'ECONNABORTED' || 
          mediaError.response?.status === 504 ||
          mediaError.message.includes('timeout')
        )) {
          console.log(`WhatsApp media message to ${whatsappPhone}@c.us timed out (504), but treating as success`);
          return true;
        }
        
        console.error(`Error sending WhatsApp media message to ${whatsappPhone}@c.us:`, mediaError);
        console.log('Falling back to text message...');
        // Fall back to sending a text message
      }
    }
    
    // Send a text message (either as fallback or if no image was provided)
    console.log('Sending WhatsApp text message...');
    const response = await axios.post(
      `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-message`,
      {
        chatId: whatsappPhone + '@c.us',
        message: formattedMessage
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WAAPI_TOKEN}`
        },
        timeout: timeoutMs // Use the environment-specific timeout
      }
    );
    
    console.log('WhatsApp API response:', response.data);
    
    // Check if the message was sent successfully
    const success = response.data?.data?.status === 'success';
    
    if (success) {
      console.log(`WhatsApp confirmation message sent successfully to ${whatsappPhone}@c.us`);
    } else {
      console.error(`Failed to send WhatsApp message to ${whatsappPhone}@c.us:`, response.data);
    }
    
    return success;
  } catch (error) {
    // Check if it's a timeout error (504) - treat as success
    if (axios.isAxiosError(error) && (
      error.code === 'ECONNABORTED' || 
      error.response?.status === 504 ||
      error.message.includes('timeout')
    )) {
      console.log(`WhatsApp message to ${whatsappPhone}@c.us timed out (504), but treating as success`);
      return true;
    }
    
    console.error(`Error sending WhatsApp message to ${whatsappPhone}@c.us:`, error);
    return false;
  }
}

/**
 * Sends an email with the invitation
 */
export async function sendEmail(email: string, name: string, code: string, subject: string, htmlMessage: string, eventLink: string, imageBuffer?: Buffer, imageUrl?: string): Promise<boolean> {
  try {
    console.log(`Sending email to ${name} (${email})`)
    
    // Add the image placeholder if not already present in the message
    let personalizedMessage = htmlMessage;
    if (imageBuffer && !htmlMessage.includes('{{image}}')) {
      personalizedMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin: 20px 0;">
            <a href="${eventLink}#${code}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none;">
              Confirm Your Attendance
            </a>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <p style="margin-bottom: 15px; font-size: 16px;"> Dr. Fred Afor George and Mrs. Ogheneovo Fred George warmly invite you to the church dedication of their son.

To confirm and secure your reservation, please click the link below and complete the form. This will help us plan effectively.

Please note: Attendance is strictly by invitation, and submitting the completed form will grant you an access code required for entry to the venue.

We look forward to celebrating this special occasion with you.</p>
            <p style="margin-bottom: 20px;"><a href="${eventLink}#${code}" style="color: #4CAF50; text-decoration: underline;">${eventLink}#${code}</a></p>
            <a href="${eventLink}#${code}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none;">
              Confirm Your Attendance
            </a>
          </div>
        </div>
      `;
    }
    
    // Now replace template variables
    personalizedMessage = personalizedMessage
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{code\}\}/g, code)
      .replace(/\{\{link\}\}/g, eventLink ? `${eventLink}#${code}` : `https://greenvites.online/jessegeorge#${code}`)
      .replace(/\{\{Image\}\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>')
      .replace(/\{\{image\}\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>')
      .replace(/\{name\}/g, name)
      .replace(/\{code\}/g, code)
      .replace(/\{link\}/g, eventLink ? `${eventLink}#${code}` : `https://greenvites.online/jessegeorge#${code}`)
      .replace(/\{Image\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>')
      .replace(/\{image\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>')
      .replace(/\{\{\{name\}\}\}/g, name)
      .replace(/\{\{\{code\}\}\}/g, code)
      .replace(/\{\{\{link\}\}\}/g, eventLink ? `${eventLink}#${code}` : `https://greenvites.online/jessegeorge#${code}`)
      .replace(/\{\{\{Image\}\}\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>')
      .replace(/\{\{\{image\}\}\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>');
    
    // Convert simple newlines to HTML breaks for plain text templates
    if (!personalizedMessage.includes('<div') && !personalizedMessage.includes('<p') && !personalizedMessage.includes('<br')) {
      personalizedMessage = personalizedMessage.replace(/\n/g, '<br>');
      personalizedMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">${personalizedMessage}</div>`;
    }
    
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

    // Function to fetch image from URL
    const fetchImageFromUrl = async (url: string): Promise<Buffer | null> => {
      try {
        console.log(`Fetching image from URL: ${url}`);
        
        // Add retry logic for image fetching
        const fetchWithRetry = async (attempt = 1, maxAttempts = 3) => {
          try {
            const response = await axios.get(url, { 
              responseType: 'arraybuffer',
              timeout: 15000, // 15 second timeout
              headers: {
                'Accept': 'image/*',
                'Cache-Control': 'no-cache'
              }
            });
            return response.data;
          } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
            if (attempt < maxAttempts) {
              console.log(`Retrying... (${attempt}/${maxAttempts})`);
              // Wait 1 second before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
              return fetchWithRetry(attempt + 1, maxAttempts);
            }
            throw error;
          }
        };
        
        const imageData = await fetchWithRetry();
        return Buffer.from(imageData);
      } catch (error) {
        console.error('Error fetching image from URL:', error);
        return null;
      }
    };
    
    // If we have an image URL but no buffer, try to fetch the image
    if (!imageBuffer && imageUrl) {
      const fetchedBuffer = await fetchImageFromUrl(imageUrl);
      if (fetchedBuffer) {
        imageBuffer = fetchedBuffer;
        console.log(`Successfully fetched image from URL, size: ${imageBuffer.length} bytes`);
      }
    }

    // Use the original image buffer for emails - no resizing
    const mailOptions: any = {
      from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Greenvites" <${process.env.SMTP_USER}>` : 'noreply@greenvites.com'),
      to: email,
      subject: subject,
      html: personalizedMessage,
    }

    if (imageBuffer) {
      console.log(`Using original image for email with size: ${imageBuffer.length} bytes`);
      console.log('Adding image attachment with CID: invitation-image');
      mailOptions.attachments = [
        {
          filename: 'invitation.jpg',
          content: imageBuffer,
          cid: 'invitation-image' // Same CID value as in the <img> tag
        }
      ]
    }

    try {
      const info = await transport.sendMail(mailOptions)
      console.log(`Email sent successfully to ${name} (${email}): ${info.messageId}`)
      return true
    } catch (sendError: any) {
      console.error(`Failed to send email to ${name}:`, sendError)
      console.error('Send error details:', sendError.message);
      
      if (sendError.response && sendError.response.status === 504) {
        console.log(`Email to ${email} received a 504 error, treating as successful`);
        await prisma.invite.create({
          data: {
            name,
            email,
            type: 'email',
            status: '504-error',
            errorMessage: '504 Gateway Timeout',
            code,
            sent: true,
            sentAt: new Date(),
            batchId: '00000000-0000-0000-0000-000000000000' // Use a placeholder batch ID
          }
        });
        return true;
      }
      return false
    }
  } catch (error: any) {
    console.error(`Failed to send email to ${name}:`, error)
    return false
  }
}
