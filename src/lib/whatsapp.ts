
'use server';

const baseUrl = process.env.INFOBIP_BASE_URL;
const apiKey = process.env.INFOBIP_API_KEY;
const senderNumber = process.env.INFOBIP_SENDER_NUMBER;

/**
 * Sends a WhatsApp message using Infobip.
 * @param to The recipient's phone number in E.164 format (e.g., '60123456789').
 * @param body The message content.
 * @returns An object indicating success or failure.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!baseUrl || !apiKey || !senderNumber) {
    const errorMessage = 'Infobip service is not configured on the server. Please check environment variables.';
    console.error(errorMessage);
    return { success: false, error: errorMessage };
  }

  // Infobip expects numbers without the leading '+' or any spaces.
  const formatNumber = (num: string) => num.replace(/\s/g, '').replace(/^\+/, '');
  
  const formattedTo = formatNumber(to);
  const formattedFrom = formatNumber(senderNumber);

  const endpoint = `https://${baseUrl}/whatsapp/1/message/text`;
  
  const payload = {
    from: formattedFrom,
    to: formattedTo,
    content: {
      text: body,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `App ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorDetails = result.requestError?.serviceException?.text || 'Unknown API error';
      throw new Error(`API request failed with status ${response.status}: ${errorDetails}`);
    }

    console.log(`WhatsApp message sent successfully to ${formattedTo}. Message ID: ${result.messages[0]?.messageId}`);
    return { success: true, messageId: result.messages[0]?.messageId };

  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${formattedTo}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during message sending';
    return { success: false, error: errorMessage };
  }
}
