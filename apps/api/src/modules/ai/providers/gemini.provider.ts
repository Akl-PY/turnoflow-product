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
    const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    this.apiKey = rawKey.replace(/^['"]|['"]$/g, '').trim();

    const rawModel = process.env.AI_MODEL || '';
    const cleanModel = rawModel.replace(/^['"]|['"]$/g, '').trim();
    // gemini-3.5-flash y gemini-3.5-flash-lite son los modelos activos de Google AI Studio con cuota disponible
    this.defaultModel = cleanModel || 'gemini-3.5-flash';
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY (o GOOGLE_API_KEY) no está configurada.');
    }

    const rawRequested = options?.model || this.defaultModel;
    const primaryModel = rawRequested.replace(/^['"]|['"]$/g, '').trim();

    // Lista de modelos ordenados para fallback automático si el principal está deprecated o agota cuota
    const modelsToTry = [
      primaryModel,
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-2.5-flash'
    ].filter((m, idx, arr) => arr.indexOf(m) === idx);

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

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 25000
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
        lastError = error;
        const errDetails = error.response?.data?.error?.message || error.message;
        const status = error.response?.status;
        const isRetryable =
          status === 429 ||
          status === 404 ||
          errDetails?.toLowerCase().includes('quota') ||
          errDetails?.toLowerCase().includes('rate') ||
          errDetails?.toLowerCase().includes('not found') ||
          errDetails?.toLowerCase().includes('no longer available');

        this.logger.warn(`Modelo ${model} no disponible (${status || ''} ${errDetails}). Intentando siguiente opción...`);

        if (!isRetryable) {
          break;
        }
      }
    }

    const finalErrMsg = lastError?.response?.data?.error?.message || lastError?.message || 'Error desconocido';
    this.logger.error(`Error en Gemini API: ${finalErrMsg}`);
    throw new Error(`Gemini Provider falló: ${finalErrMsg}`);
  }
}
