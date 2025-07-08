
'use server';

/**
 * Sends a WhatsApp message using Infobip.
 * @param to The recipient's phone number in E.164 format (e.g., '60123456789').
 * @param body The message content.
 * @returns An object indicating success or failure.
 */
export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // NOTE: Hardcoding credentials to bypass environment loading issues for now.
  // This is not recommended for production environments.
  const baseUrl = 'lqyllw.api.infobip.com';
  const apiKey = '769203a73bc44130d27fa2de02d40fbe-8fd8e2e8-52ac-4d98-80a3-b284f204efc3';
  const senderNumber = '447860099299';
  
  if (!baseUrl || !apiKey || !senderNumber) {
    const errorMessage = 'Infobip service is not configured. Hardcoded credentials are missing.';
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

    // Defensive check to ensure the response structure is as expected
    if (result && Array.isArray(result.messages) && result.messages.length > 0) {
        const messageId = result.messages[0]?.messageId;
        console.log(`WhatsApp message sent successfully to ${formattedTo}. Message ID: ${messageId}`);
        return { success: true, messageId: messageId };
    } else {
        // This handles cases where the API returns 200 OK but the body is unexpected
        console.warn(`Infobip returned a successful status but with an unexpected response body for ${formattedTo}:`, JSON.stringify(result));
        throw new Error(`API returned a success status but with an unexpected response body.`);
    }

  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${formattedTo}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during message sending';
    return { success: false, error: errorMessage };
  }
}
