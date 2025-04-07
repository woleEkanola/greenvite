import axios from "axios";
import path from "path";
import fs from "fs";

// WhatsApp API configuration
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;

// Default image path
const DEFAULT_IMAGE_PATH = path.join(process.cwd(), 'public', 'jessegeorge.jpg');

// Log configuration status on startup
console.log('WhatsApp API Configuration Status:', {
  tokenConfigured: !!WAAPI_TOKEN,
  tokenLength: WAAPI_TOKEN ? WAAPI_TOKEN.length : 0,
  baseUrlConfigured: !!WAAPI_BASE_URL,
  baseUrl: WAAPI_BASE_URL,
  instanceIdConfigured: !!INSTANCE_ID,
  instanceId: INSTANCE_ID,
  defaultImageExists: fs.existsSync(DEFAULT_IMAGE_PATH),
  environment: process.env.NODE_ENV || 'development',
  publicUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
});

// Check if the token is in the correct format (might be a common issue)
if (WAAPI_TOKEN) {
  if (WAAPI_TOKEN.startsWith('"') || WAAPI_TOKEN.endsWith('"')) {
    console.warn('WARNING: WhatsApp API token contains quote characters. This may cause authentication issues.');
  }
  
  if (WAAPI_TOKEN.includes(' ')) {
    console.warn('WARNING: WhatsApp API token contains spaces. This may cause authentication issues.');
  }
}

/**
 * Send a WhatsApp message with optional image attachment
 * @param phone Phone number to send to (with or without + prefix)
 * @param message Text message to send
 * @param imageUrl Optional URL of image to attach
 * @param includeImageInWhatsApp Whether to include the image in WhatsApp message
 * @returns Promise resolving to success status
 */
async function sendWhatsAppNotification(
  phone: string, 
  message: string, 
  imageUrl?: string | null,
  includeImageInWhatsApp: boolean = true
): Promise<boolean> {
  console.log(`Attempting to send WhatsApp message to ${phone}${imageUrl && includeImageInWhatsApp ? ' with image' : ''}`);
  
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
      'Authorization': `Bearer ${WAAPI_TOKEN?.trim()}`,
      'Content-Type': 'application/json'
    };

    console.log('Using authorization header:', `Bearer ${WAAPI_TOKEN?.substring(0, 5)}...`);
    
    let response;
    
    // Use default image if no image URL is provided but includeImageInWhatsApp is true
    const useDefaultImage = includeImageInWhatsApp && !imageUrl;
    const effectiveImageUrl = imageUrl || (useDefaultImage ? '/jessegeorge.jpg' : null);
    
    // If we have an image URL and includeImageInWhatsApp is true, send as media message
    if ((effectiveImageUrl) && includeImageInWhatsApp) {
      try {
        console.log(`Sending WhatsApp media message to ${formattedPhone} with image: ${effectiveImageUrl}`);
        
        // Fetch the image and convert it to base64
        let imageBase64;
        try {
          console.log(`Attempting to fetch image from: ${effectiveImageUrl}`);
          
          // If using default image from public folder, read it directly from the file system
          if (useDefaultImage) {
            try {
              console.log('Using default image from public folder');
              const imageBuffer = fs.readFileSync(DEFAULT_IMAGE_PATH);
              imageBase64 = imageBuffer.toString('base64');
              console.log(`Successfully loaded default image (${imageBase64.length} chars)`);
            } catch (fsError) {
              console.error('Error reading default image:', fsError instanceof Error ? fsError.message : String(fsError));
              throw new Error('Failed to read default image');
            }
          } else {
            // Add timeout and retry logic for image fetching
            const fetchImage = async (attempt = 1, maxAttempts = 3) => {
              try {
                const imageResponse = await axios.get(imageUrl!, { 
                  responseType: 'arraybuffer',
                  timeout: 10000, // 10 second timeout
                  headers: {
                    // Add headers that might be needed for Vercel Blob storage
                    'Accept': 'image/*',
                    'Cache-Control': 'no-cache'
                  }
                });
                return imageResponse.data;
              } catch (error) {
                console.error(`Attempt ${attempt} failed:`, error instanceof Error ? error.message : String(error));
                if (attempt < maxAttempts) {
                  console.log(`Retrying... (${attempt}/${maxAttempts})`);
                  // Wait 1 second before retrying
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  return fetchImage(attempt + 1, maxAttempts);
                }
                throw error;
              }
            };
            
            const imageData = await fetchImage();
            const buffer = Buffer.from(imageData, 'binary');
            imageBase64 = buffer.toString('base64');
            console.log(`Successfully converted image to base64 (${imageBase64.length} chars)`);
          }
        } catch (fetchError: unknown) {
          console.error('Error fetching image:', fetchError instanceof Error ? fetchError.message : String(fetchError));
          throw new Error('Failed to fetch image for WhatsApp');
        }
        
        const mediaPayload = {
          chatId: formattedPhone + '@c.us',
          mediaBase64: imageBase64,
          mediaName: 'invitation.jpg',
          mediaCaption: message
        };
        
        console.log('Media payload prepared with base64 image');
        
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
          message: message
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
      console.error('Error headers:', JSON.stringify(error.response.headers));
      console.error('Error data:', JSON.stringify(error.response.data));
      
      // Check for specific error types
      if (error.response.status === 401) {
        console.error('Authentication error: Please check your WhatsApp API token');
      } else if (error.response.status === 404) {
        console.error('API endpoint not found: Please check your WhatsApp API base URL and instance ID');
      } else if (error.response.status === 429) {
        console.error('Rate limit exceeded: Too many requests to the WhatsApp API');
      }
    } else if (error.request) {
      console.error('No response received:', error.request);
    }
    
    return false;
  }
}

export default sendWhatsAppNotification;
