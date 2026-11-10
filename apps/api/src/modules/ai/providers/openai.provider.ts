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

  private getEffectiveConfig(options?: CompletionOptions) {
    const groqKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    const openRouterKey = (process.env.OPENROUTER_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    const openAiKey = (process.env.OPENAI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();

    const apiKey = openAiKey || groqKey || openRouterKey;
    const rawBaseUrl = process.env.OPENAI_BASE_URL?.replace(/^['"]|['"]$/g, '').trim();

    let baseURL = rawBaseUrl || 'https://api.openai.com/v1';
    let defaultModel = process.env.AI_MODEL?.replace(/^['"]|['"]$/g, '').trim() || 'gpt-4o';

    if (!rawBaseUrl) {
      if (groqKey && !openAiKey) {
        baseURL = 'https://api.groq.com/openai/v1';
        defaultModel = 'llama-3.3-70b-versatile';
      } else if (openRouterKey && !openAiKey) {
        baseURL = 'https://openrouter.ai/api/v1';
        defaultModel = 'meta-llama/llama-3.3-70b-instruct:free';
      }
    } else {
      if (baseURL.includes('groq.com') && (!process.env.AI_MODEL || defaultModel === 'gpt-4o')) {
        defaultModel = 'llama-3.3-70b-versatile';
      } else if (baseURL.includes('openrouter.ai') && (!process.env.AI_MODEL || defaultModel === 'gpt-4o')) {
        defaultModel = 'meta-llama/llama-3.3-70b-instruct:free';
      }
    }

    const model = (options?.model || defaultModel).replace(/^['"]|['"]$/g, '').trim();
    return { apiKey, baseURL: baseURL.replace(/\/$/, ''), model };
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const { apiKey, baseURL, model } = this.getEffectiveConfig(options);

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY, GROQ_API_KEY o OPENROUTER_API_KEY no están configuradas.');
    }
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
      let response: any;
      try {
        response = await axios.post(
          `${baseURL}/chat/completions`,
          {
            model,
            messages: formattedMessages,
            temperature,
            max_tokens: maxTokens,
            ...(tools && tools.length > 0 ? { tools } : {})
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://turnoflow.com',
              'X-Title': 'TurnoFlow AI'
            },
            timeout: 25000
          }
        );
      } catch (apiError: any) {
        // Si el modelo seleccionado no soporta function calling / tools, reintentar sin tools
        const errData = apiError.response?.data?.error?.message || apiError.message || '';
        if (tools && tools.length > 0 && (apiError.response?.status === 400 || errData.includes('tools') || errData.includes('function'))) {
          this.logger.warn(`El modelo ${model} no admite tools. Reintentando en modo conversación directa...`);
          response = await axios.post(
            `${baseURL}/chat/completions`,
            {
              model,
              messages: formattedMessages.map(({ tool_calls, tool_call_id, ...rest }: any) => rest),
              temperature,
              max_tokens: maxTokens
            },
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://turnoflow.com',
                'X-Title': 'TurnoFlow AI'
              },
              timeout: 25000
            }
          );
        } else {
          throw apiError;
        }
      }

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
