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

  private getCandidateConfigs(options?: CompletionOptions): Array<{
    label: string;
    apiKey: string;
    baseURL: string;
    model: string;
  }> {
    const groqKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    const openRouterKey = (process.env.OPENROUTER_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    const openAiKey = (process.env.OPENAI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    const rawBaseUrl = process.env.OPENAI_BASE_URL?.replace(/^['"]|['"]$/g, '').trim();

    const rawEnvModel = (process.env.AI_MODEL || '').replace(/^['"]|['"]$/g, '').trim();
    const rawOptModel = (options?.model || '').replace(/^['"]|['"]$/g, '').trim();

    const isForeignModel = (m: string) =>
      m.toLowerCase().startsWith('gemini') || m.toLowerCase().startsWith('claude');

    const safeOptModel = rawOptModel && !isForeignModel(rawOptModel) ? rawOptModel : '';
    const safeEnvModel = rawEnvModel && !isForeignModel(rawEnvModel) ? rawEnvModel : '';

    const configs: Array<{ label: string; apiKey: string; baseURL: string; model: string }> = [];

    if (openAiKey) {
      const base = (rawBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
      const defaultM = base.includes('groq.com')
        ? 'llama-3.3-70b-versatile'
        : base.includes('openrouter.ai')
        ? 'meta-llama/llama-3.3-70b-instruct:free'
        : 'gpt-4o-mini';
      configs.push({
        label: base.includes('openrouter.ai') ? 'openrouter' : base.includes('groq.com') ? 'groq' : 'openai',
        apiKey: openAiKey,
        baseURL: base,
        model: safeOptModel || safeEnvModel || defaultM
      });
    }

    if (groqKey) {
      configs.push({
        label: 'groq',
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
        model: safeOptModel || 'llama-3.3-70b-versatile'
      });
    }

    if (openRouterKey) {
      configs.push({
        label: 'openrouter-free',
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        model: safeOptModel || 'openrouter/free'
      });
      configs.push({
        label: 'openrouter-llama',
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
        model: safeOptModel || 'meta-llama/llama-3.3-70b-instruct'
      });
    }

    return configs;
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: CompletionOptions
  ): Promise<CompletionResponse> {
    const configs = this.getCandidateConfigs(options);

    if (configs.length === 0) {
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

    let lastError: any = null;

    for (const cfg of configs) {
      try {
        let response: any;
        try {
          response = await axios.post(
            `${cfg.baseURL}/chat/completions`,
            {
              model: cfg.model,
              messages: formattedMessages,
              temperature,
              max_tokens: maxTokens,
              ...(tools && tools.length > 0 ? { tools } : {})
            },
            {
              headers: {
                Authorization: `Bearer ${cfg.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://turnoflow.com',
                'X-Title': 'TurnoFlow AI'
              },
              timeout: 25000
            }
          );
        } catch (apiError: any) {
          const errData = apiError.response?.data?.error?.message || apiError.message || '';
          if (tools && tools.length > 0 && (apiError.response?.status === 400 || errData.includes('tools') || errData.includes('function'))) {
            this.logger.warn(`El modelo ${cfg.model} no admite tools. Reintentando en modo conversación directa...`);
            response = await axios.post(
              `${cfg.baseURL}/chat/completions`,
              {
                model: cfg.model,
                messages: formattedMessages.map(({ tool_calls, tool_call_id, ...rest }: any) => rest),
                temperature,
                max_tokens: maxTokens
              },
              {
                headers: {
                  Authorization: `Bearer ${cfg.apiKey}`,
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
        this.logger.warn(`Fallo en proveedor ${cfg.label} (${cfg.model}): ${errorMsg}. Probando siguiente...`);
        lastError = new Error(`${cfg.label} Error: ${errorMsg}`);
      }
    }

    throw lastError || new Error('Todos los proveedores compatibles con OpenAI fallaron.');
  }
}
