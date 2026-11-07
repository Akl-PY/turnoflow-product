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
export class AnthropicProvider implements AiProviderInterface {
  readonly providerName = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.defaultModel = process.env.AI_MODEL || 'claude-3-5-sonnet-20241022';
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY no está configurada.');
    }

    const model = options?.model || this.defaultModel;
    const temperature = options?.temperature ?? 0.2;
    const maxTokens = options?.maxTokens ?? 1024;

    // Anthropic separa el prompt de sistema del array de mensajes
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'tool') {
          return {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: m.toolCallId,
                content: m.content
              }
            ]
          };
        }
        if (m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0) {
          const contentBlocks: any[] = [];
          if (m.content) {
            contentBlocks.push({ type: 'text', text: m.content });
          }
          m.toolCalls.forEach((tc) => {
            contentBlocks.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments
            });
          });
          return {
            role: 'assistant',
            content: contentBlocks
          };
        }
        return {
          role: m.role,
          content: m.content
        };
      });

    // Mapeo de herramientas al formato de Anthropic
    const tools = options?.tools?.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters
    }));

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          max_tokens: maxTokens,
          temperature,
          system: systemMessage?.content,
          messages: conversationMessages,
          ...(tools && tools.length > 0 ? { tools } : {})
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          timeout: 25000
        }
      );

      const data = response.data;
      let textContent = '';
      const toolCalls: ToolCall[] = [];

      for (const block of data.content || []) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            name: block.name,
            arguments: block.input || {}
          });
        }
      }

      return {
        content: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        usage: {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0
        }
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      this.logger.error(`Error en llamada a Anthropic: ${errorMsg}`);
      throw new Error(`Anthropic Error: ${errorMsg}`);
    }
  }
}
