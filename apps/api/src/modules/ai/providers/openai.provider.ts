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
export class OpenAiProvider implements AiProviderInterface {
  readonly providerName = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseURL: string;

  constructor() {
    const rawKey = process.env.OPENAI_API_KEY || '';
    this.apiKey = rawKey.replace(/^['"]|['"]$/g, '').trim();

    const rawModel = process.env.AI_MODEL || '';
    this.defaultModel = rawModel.replace(/^['"]|['"]$/g, '').trim() || 'gpt-4o';

    const rawUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
    this.baseURL = rawUrl.replace(/^['"]|['"]$/g, '').trim().replace(/\/$/, '');
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada.');
    }

    const model = (options?.model || this.defaultModel).replace(/^['"]|['"]$/g, '').trim();
    const temperature = options?.temperature ?? 0.2;
    const maxTokens = options?.maxTokens ?? 1024;

    const formattedMessages = messages.map((m) => {
      const msg: any = {
        role: m.role,
        content: m.content
      };
      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }));
      }
      if (m.toolCallId) {
        msg.tool_call_id = m.toolCallId;
      }
      if (m.name) {
        msg.name = m.name;
      }
      return msg;
    });

    const tools = options?.tools?.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages: formattedMessages,
          temperature,
          max_tokens: maxTokens,
          ...(tools && tools.length > 0 ? { tools } : {})
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 25000
        }
      );

      const choice = response.data.choices?.[0];
      const message = choice?.message;
      const textContent = message?.content || '';

      const toolCalls: ToolCall[] = [];
      if (message?.tool_calls) {
        for (const tc of message.tool_calls) {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.function.arguments);
          } catch {
            parsedArgs = {};
          }
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: parsedArgs
          });
        }
      }

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: response.data.usage?.prompt_tokens || 0,
          outputTokens: response.data.usage?.completion_tokens || 0
        }
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Error en llamada a OpenAI: ${errorMsg}`);
      throw new Error(`OpenAI Error: ${errorMsg}`);
    }
  }
}
