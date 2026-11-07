import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  AiProviderInterface,
  ChatMessage,
  CompletionOptions,
  CompletionResponse,
  ToolCall
} from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider implements AiProviderInterface {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.defaultModel = process.env.AI_MODEL || 'gemini-2.5-flash';
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY (o GOOGLE_API_KEY) no está configurada.');
    }

    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.2;
    const maxTokens = options?.maxTokens ?? 1024;

    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Mapear mensajes al formato Gemini: 'user' o 'model'
    const contents = conversationMessages.map((m) => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      return {
        role,
        parts: [{ text: m.content || '' }]
      };
    });

    const payload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    };

    if (systemMessage) {
      payload.systemInstruction = {
        parts: [{ text: systemMessage.content }]
      };
    }

    if (options?.tools && options.tools.length > 0) {
      payload.tools = [
        {
          functionDeclarations: options.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters
          }))
        }
      ];
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const candidate = response.data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      let content = '';
      const toolCalls: ToolCall[] = [];

      for (const part of parts) {
        if (part.text) {
          content += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: part.functionCall.name,
            arguments: part.functionCall.args || {}
          });
        }
      }

      const usageMetadata = response.data.usageMetadata || {};

      return {
        content: content.trim(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: usageMetadata.promptTokenCount || 0,
          outputTokens: usageMetadata.candidatesTokenCount || 0
        }
      };
    } catch (error: any) {
      const errDetails = error.response?.data?.error?.message || error.message;
      this.logger.error(`Error en Gemini API: ${errDetails}`);
      throw new Error(`Gemini Provider falló: ${errDetails}`);
    }
  }
}
