'use server';

import twilio from 'twilio';

// These will be read from environment variables on the server
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// Initialize Twilio client only if credentials are provided
const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

/**
 * Sends a WhatsApp message using Twilio.
 * @param to The recipient's phone number in E.164 format (e.g., '+60123456789').
 * @param body The message content.
 * @returns An object indicating success or failure.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; error?: string; sid?: string }> {
  if (!client || !fromNumber) {
    const errorMessage = 'Twilio service is not configured on the server. Please check environment variables.';
    console.error(errorMessage);
    // Return an error but don't crash the app
    return { success: false, error: errorMessage };
  }

  try {
    const message = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${to}`,
      body: body,
    });
    console.log(`WhatsApp message sent successfully to ${to}. SID: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${to}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during message sending';
    return { success: false, error: errorMessage };
  }
}
