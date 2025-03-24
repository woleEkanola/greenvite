import axios from "axios";

// WhatsApp API configuration
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;


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

export default sendWhatsAppNotification;
