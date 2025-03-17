declare module 'africastalking' {
  interface SMSOptions {
    to: string[] | string;
    message: string;
    from?: string;
    enqueue?: boolean;
  }

  interface SMSResponse {
    SMSMessageData: {
      Message: string;
      Recipients: Array<{
        statusCode: string;
        number: string;
        status: string;
        cost: string;
        messageId: string;
      }>;
    };
  }

  interface SMS {
    send(options: SMSOptions): Promise<SMSResponse>;
  }

  interface AfricasTalkingInstance {
    SMS: SMS;
  }

  export default function(options: { apiKey: string; username: string }): AfricasTalkingInstance;
}
