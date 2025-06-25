export interface N8nWebhookPayload {
  chatInput: string;
  sessionId: string;
}

export interface N8nWebhookResponse {
  data?: any;
  response?: string | string[];
  cmd?: string | null;
  success: boolean;
  message?: string;
  pdbIds?: string[];
  metadata?: any;
  agentName?: string;
  pdbData?: any;
}

export interface N8nOutputResponse {
  output: string;
}

export interface N8nStructuredResponse {
  responseText: string;
  agentName: string;
  pdbId?: string;
  pdbUrl?: string;
  proteinName?: string;
  proteinDataPDB?: string;
  query_id?: string;
  result_set?: any[];
}

export class N8nWebhookService {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  private extractPdbIds(text: string): string[] {
    const pdbIdPattern = /\b([A-Z0-9]{4})\b/g;
    const matches = text.match(pdbIdPattern);
    
    if (!matches) return [];
    
    const uniqueIds = [...new Set(matches)];
    const falsePositives = ['HTTP', 'JSON', 'HTML', 'REST', 'API', 'URL', 'POST', 'GET', 'PUT', 'DELETE', 'PDB', 'RCSB'];
    
    return uniqueIds.filter(id => {
      const isFalsePositive = falsePositives.includes(id);
      const isRepeated = /^(.)\1{3}$/.test(id);
      return !isFalsePositive && !isRepeated;
    });
  }

  async sendMessage(payload: N8nWebhookPayload): Promise<N8nWebhookResponse> {
    try {
      console.log('=== N8N WEBHOOK REQUEST ===');
      console.log('Sending message to n8n webhook:', {
        url: this.webhookUrl,
        payload
      });

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('=== N8N RAW RESPONSE ===');
      console.log('Raw n8n response:', responseText);
      console.log('Response length:', responseText.length);

      let data: any;
      let outputMessage: string = '';
      let metadata: any = {};
      let agentName: string | undefined;
      let pdbData: any = undefined;

      try {
        console.log('=== PARSING JSON RESPONSE ===');
        // Try to parse as JSON
        data = JSON.parse(responseText);
        console.log('Parsed JSON data:', data);
        
        // Handle the new structured response format
        if (data.responseText && data.agentName) {
          console.log('=== STRUCTURED RESPONSE DETECTED ===');
          outputMessage = data.responseText;
          agentName = data.agentName;
          metadata = { ...data };
          // delete metadata.responseText;
          // delete metadata.agentName;
          
          console.log('Extracted structured data:');
          console.log('- responseText:', outputMessage);
          console.log('- agentName:', agentName);
          console.log('- metadata:', metadata);
          
          // Extract PDB-specific data if this is from PDB Agent
          if (data.agentName === 'PDBAgent' && data.pdbId) {
            console.log('=== PDB AGENT DATA DETECTED ===');
            pdbData = {
              pdbId: data.pdbId,
              pdbUrl: data.pdbUrl,
              proteinName: data.proteinName,
              proteinDataPDB: data.proteinDataPDB,
              query_id: data.query_id,
              result_set: data.result_set
            };
            console.log('Extracted PDB data:', pdbData);
          } else if (data.agentName === 'PDBAgent') {
            console.log('=== PDB AGENT RESPONSE WITHOUT PDB ID ===');
            console.log('PDB Agent response but no pdbId found:', data);
          }
        }
        // // Handle array format: [{"output": "message"}]
        // else if (Array.isArray(data) && data.length > 0 && data[0].output) {
        //   console.log('=== ARRAY RESPONSE FORMAT ===');
        //   outputMessage = data[0].output;
        //   metadata = { ...data[0] };
        //   delete metadata.output;
        //   console.log('Array response data:', { outputMessage, metadata });
        // }
        // // Handle direct object format: {"output": "message"}
        // else if (data.output) {
        //   console.log('=== OBJECT RESPONSE FORMAT ===');
        //   outputMessage = data.output;
        //   metadata = { ...data };
        //   delete metadata.output;
        //   console.log('Object response data:', { outputMessage, metadata });
        // }
        // Handle other JSON formats
        // else if (data.message) {
        //   console.log('=== MESSAGE RESPONSE FORMAT ===');
        //   outputMessage = data.message;
        //   metadata = { ...data };
        //   delete metadata.message;
        //   console.log('Message response data:', { outputMessage, metadata });
        // }
        // Fallback to stringify the whole response
        else {
          console.log('=== FALLBACK RESPONSE FORMAT ===');
          outputMessage = JSON.stringify(data);
          metadata = data;
          console.log('Fallback response data:', { outputMessage, metadata });
        }
      } catch (parseError) {
        console.log('=== JSON PARSE ERROR ===');
        // If JSON parsing fails, treat as plain text
        console.log('Response is not JSON, treating as plain text');
        console.log('Parse error:', parseError);
        outputMessage = responseText;
        data = { rawResponse: responseText };
      }
      
      // Extract PDB IDs from the response message (for backward compatibility)
      // console.log('=== EXTRACTING PDB IDs ===');
      // const pdbIds = this.extractPdbIds(outputMessage);
      // console.log('Extracted PDB IDs from text:', pdbIds);
      
      const finalResponse: N8nWebhookResponse = {
        success: true,
        message: outputMessage,
        data,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        agentName,
        pdbData,
        ...(pdbData?.pdbId ? { pdbIds: [pdbData.pdbId] } : {}),
      };
      
      console.log('=== FINAL WEBHOOK RESPONSE ===');
      console.log('Final response object:', finalResponse);
      console.log('================================');
      
      return finalResponse;
    } catch (error) {
      console.log('=== WEBHOOK ERROR ===');
      console.error('Error sending message to n8n webhook:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async sendChatMessage(chatInput: string, sessionId: string): Promise<N8nWebhookResponse> {
    const payload: N8nWebhookPayload = {
      chatInput,
      sessionId,
    };

    return this.sendMessage(payload);
  }
}

let n8nWebhookService: N8nWebhookService | null = null;

export const getN8nWebhookService = (): N8nWebhookService | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!n8nWebhookService) {
    const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('N8N_WEBHOOK_URL environment variable is not set. Please add NEXT_PUBLIC_N8N_WEBHOOK_URL to your .env.local file.');
      return null;
    }

    if (webhookUrl === 'https://your-n8n-instance.com/webhook/your-webhook-id') {
      console.error('Please replace the placeholder webhook URL with your actual n8n webhook URL in .env.local');
      return null;
    }

    n8nWebhookService = new N8nWebhookService(webhookUrl);
  }

  return n8nWebhookService;
}; 