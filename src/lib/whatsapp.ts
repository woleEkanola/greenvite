import axios from "axios";
import sharp from "sharp";

// WhatsApp API configuration
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;

// Log configuration status on startup
console.log('WhatsApp API Configuration Status:', {
  tokenConfigured: !!WAAPI_TOKEN,
  baseUrlConfigured: !!WAAPI_BASE_URL,
  instanceIdConfigured: !!INSTANCE_ID
});

/**
 * Send a WhatsApp message with optional image attachment
 * @param phone Phone number to send to (with or without + prefix)
 * @param message Text message to send
 * @param imageUrl Optional URL of image to attach
 * @returns Promise resolving to success status
 */
async function sendWhatsAppNotification(
  phone: string, 
  message: string, 
  imageUrl?: string | null
): Promise<boolean> {
  console.log(`Attempting to send WhatsApp message to ${phone}${imageUrl ? ' with image' : ''}`);
  
  // Format phone number by removing any leading + sign
  const formattedPhone = phone.replace(/^\+/, '');
  
  try {
    if (!WAAPI_TOKEN || !INSTANCE_ID) {
      console.error('WhatsApp API configuration is incomplete:', {
        tokenMissing: !WAAPI_TOKEN,
        instanceIdMissing: !INSTANCE_ID
      });
      return false;
    }

    // Base endpoint for WhatsApp API
    const baseEndpoint = `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action`;
    
    // Common headers for all requests
    const headers = {
      'Authorization': `Bearer ${WAAPI_TOKEN}`,
      'Content-Type': 'application/json'
    };

    let response;
    
    // If we have an image URL, send as media message
    if (imageUrl) {
      try {
        console.log(`Sending WhatsApp media message to ${formattedPhone} with image: ${imageUrl}`);
        
        const mediaPayload = {
          chatId: formattedPhone + '@c.us',
          caption: message,
          url: imageUrl
        };
        
        console.log('Media payload:', JSON.stringify(mediaPayload));
        
        response = await axios.post(
          `${baseEndpoint}/send-media`,
          mediaPayload,
          {
            headers,
            timeout: 15000 // Increased timeout for media messages
          }
        );
      } catch (mediaError: any) {
        console.error('Failed to send media message:', mediaError.message);
        console.log('Falling back to text-only message');
        
        // If media sending fails, fall back to text-only message
        const textPayload = {
          chatId: formattedPhone + '@c.us',
          message: `${message}\n\n(Note: Image could not be sent)`
        };
        
        response = await axios.post(
          `${baseEndpoint}/send-message`,
          textPayload,
          {
            headers,
            timeout: 10000
          }
        );
      }
    } else {
      // Text-only message
      const textPayload = {
        chatId: formattedPhone + '@c.us',
        message: message
      };

      console.log(`Sending WhatsApp text message to ${baseEndpoint}/send-message`);
      console.log('Payload:', JSON.stringify(textPayload));

      response = await axios.post(
        `${baseEndpoint}/send-message`,
        textPayload,
        {
          headers,
          timeout: 10000
        }
      );
    }

    console.log('WhatsApp API response:', response.data);

    if (response.data?.data?.status === 'success') {
      console.log(`WhatsApp notification sent successfully to ${phone}`);
      return true;
    } else {
      console.error(`Failed to send WhatsApp notification:`, response.data);
      return false;
    }
  } catch (error: any) {
    console.error('Error sending WhatsApp notification:', error.message);
    
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error headers:', error.response.headers);
      console.error('Error data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    
    return false;
  }
}

export default sendWhatsAppNotification;
