import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import type { z } from 'zod';
import type { AiProvider } from '@study-helper/shared';

// One small interface over Anthropic and OpenAI so the rest of the app doesn't care which key a
// family brought. Only text, images and PDFs are needed.

export interface Attachment {
  mediaType: string;
  base64: string;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  attachments?: Attachment[];
}

export type Effort = 'low' | 'medium' | 'high';

export interface ChatRequest {
  system: string;
  turns: ChatTurn[];
  maxTokens: number;
  effort: Effort;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface TextResult {
  text: string;
  usage: Usage;
  refused: boolean;
}

export interface JsonResult<T> {
  data: T | null;
  usage: Usage;
  refused: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export interface LlmClient {
  provider: AiProvider;
  model: string;
  streamText(req: ChatRequest, onDelta: (delta: string) => void): Promise<TextResult>;
  generateJson<S extends z.ZodType>(req: ChatRequest, schema: S, name: string): Promise<JsonResult<z.infer<S>>>;
}

// ---------------------------------------------------------------------------------------------
// Anthropic

/** Default Claude model. Parents can pick another in settings. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';

/** Models that accept `output_config.effort`. */
const EFFORT_MODELS = /^claude-(fable-5|mythos-5|opus-5|opus-4-[678]|sonnet-5|sonnet-4-6|haiku-5-5)/;
/** Models that accept server-side `fallbacks: "default"` on refusals. */
const FALLBACK_MODELS = /^claude-(fable-5-1|opus-5-5|opus-5$|sonnet-5-5)/;

/** USD per million tokens (input, output), for budget estimates. Unknown models use a cautious default. */
const PRICES: Array<[RegExp, number, number]> = [
  [/^claude-(fable|mythos)-5/, 10, 50],
  [/^claude-opus-5-5/, 4, 20],
  [/^claude-opus-(5|4)/, 5, 25],
  [/^claude-sonnet-5/, 2, 10],
  [/^claude-sonnet-4-6/, 3, 15],
  [/^claude-haiku-5-5/, 0.1, 0.5],
  [/^claude-haiku-4-5/, 1, 5],
];
const DEFAULT_PRICE: [number, number] = [5, 25];

export function estimateCostUsd(usage: Usage): number {
  const p = PRICES.find(([re]) => re.test(usage.model));
  const [inP, outP] = p ? [p[1], p[2]] : DEFAULT_PRICE;
  return (usage.inputTokens * inP + usage.outputTokens * outP) / 1_000_000;
}

function anthropicContent(turn: ChatTurn): Anthropic.Beta.BetaContentBlockParam[] {
  const blocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const a of turn.attachments ?? []) {
    if (a.mediaType === 'application/pdf') {
      blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.base64 } });
    } else {
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: a.mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp', data: a.base64 },
      });
    }
  }
  blocks.push({ type: 'text', text: turn.text });
  return blocks;
}

function anthropicParams(model: string, req: ChatRequest) {
  return {
    model,
    max_tokens: req.maxTokens,
    system: [{ type: 'text' as const, text: req.system, cache_control: { type: 'ephemeral' as const } }],
    messages: req.turns.map((t) => ({ role: t.role, content: anthropicContent(t) })),
    ...(EFFORT_MODELS.test(model) && { output_config: { effort: req.effort } }),
    ...(FALLBACK_MODELS.test(model) && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
  };
}

function anthropicClient(apiKey: string, model: string): LlmClient {
  const client = new Anthropic({ apiKey, maxRetries: 2, timeout: 180_000 });
  return {
    provider: 'anthropic',
    model,
    async streamText(req, onDelta) {
      const stream = client.beta.messages.stream(anthropicParams(model, req));
      stream.on('text', (delta) => onDelta(delta));
      const msg = await stream.finalMessage();
      const refused = msg.stop_reason === 'refusal';
      const text = refused ? '' : msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
      return {
        text,
        refused,
        usage: { inputTokens: msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0), outputTokens: msg.usage.output_tokens, model: msg.model },
      };
    },
    async generateJson(req, schema) {
      const base = anthropicParams(model, req);
      const msg = await client.beta.messages.parse({
        ...base,
        output_config: { ...(base.output_config ?? {}), format: zodOutputFormat(schema) },
      });
      const refused = msg.stop_reason === 'refusal';
      return {
        data: refused ? null : (msg.parsed_output ?? null),
        refused,
        usage: { inputTokens: msg.usage.input_tokens + (msg.usage.cache_read_input_tokens ?? 0), outputTokens: msg.usage.output_tokens, model: msg.model },
      };
    },
  };
}

// ---------------------------------------------------------------------------------------------
// OpenAI (Responses API)

type OpenAiInput = OpenAI.Responses.ResponseInputItem[];

function openAiInput(turns: ChatTurn[]): OpenAiInput {
  return turns.map((t) => {
    if (t.role === 'assistant') return { role: 'assistant' as const, content: t.text };
    const content: OpenAI.Responses.ResponseInputContent[] = [];
    for (const a of t.attachments ?? []) {
      if (a.mediaType === 'application/pdf') {
        content.push({ type: 'input_file', filename: 'upload.pdf', file_data: `data:application/pdf;base64,${a.base64}` });
      } else {
        content.push({ type: 'input_image', image_url: `data:${a.mediaType};base64,${a.base64}`, detail: 'auto' });
      }
    }
    content.push({ type: 'input_text', text: t.text });
    return { role: 'user' as const, content };
  });
}

function openAiClient(apiKey: string, model: string): LlmClient {
  const client = new OpenAI({ apiKey, maxRetries: 2, timeout: 180_000 });
  return {
    provider: 'openai',
    model,
    async streamText(req, onDelta) {
      const stream = await client.responses.create({
        model,
        instructions: req.system,
        input: openAiInput(req.turns),
        max_output_tokens: req.maxTokens,
        stream: true,
      });
      let text = '';
      let usage: Usage = { inputTokens: 0, outputTokens: 0, model };
      let refused = false;
      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') {
          text += event.delta;
          onDelta(event.delta);
        } else if (event.type === 'response.refusal.delta') {
          refused = true;
        } else if (event.type === 'response.completed' && event.response.usage) {
          usage = { inputTokens: event.response.usage.input_tokens, outputTokens: event.response.usage.output_tokens, model: event.response.model };
        }
      }
      return { text, usage, refused };
    },
    async generateJson(req, schema, name) {
      const res = await client.responses.parse({
        model,
        instructions: req.system,
        input: openAiInput(req.turns),
        max_output_tokens: req.maxTokens,
        text: { format: zodTextFormat(schema, name) },
      });
      return {
        data: (res.output_parsed as z.infer<typeof schema> | null) ?? null,
        refused: false,
        usage: { inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0, model: res.model },
      };
    },
  };
}

// ---------------------------------------------------------------------------------------------

export function createLlm(provider: AiProvider, apiKey: string, model: string): LlmClient {
  return provider === 'anthropic' ? anthropicClient(apiKey, model) : openAiClient(apiKey, model);
}

/** Lists chat-capable models for a key; also serves as the key validity check. */
export async function listModels(provider: AiProvider, apiKey: string): Promise<ModelInfo[]> {
  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 20_000 });
    const out: ModelInfo[] = [];
    for await (const m of client.models.list({ limit: 100 })) out.push({ id: m.id, name: m.display_name });
    return out.filter((m) => m.id.startsWith('claude-'));
  }
  const client = new OpenAI({ apiKey, maxRetries: 1, timeout: 20_000 });
  const out: ModelInfo[] = [];
  for await (const m of client.models.list()) {
    if (/^(gpt-|o\d)/.test(m.id) && !/(audio|realtime|transcribe|tts|image|search|embedding|instruct|codex)/.test(m.id)) {
      out.push({ id: m.id, name: m.id });
    }
  }
  return out.sort((a, b) => b.id.localeCompare(a.id));
}

/** Picks a sensible default model from what the key can access. */
export function defaultModel(provider: AiProvider, models: ModelInfo[]): string {
  const ids = models.map((m) => m.id);
  if (provider === 'anthropic') {
    return ids.includes(DEFAULT_ANTHROPIC_MODEL) ? DEFAULT_ANTHROPIC_MODEL : (ids.find((id) => id.startsWith('claude-opus')) ?? ids[0] ?? DEFAULT_ANTHROPIC_MODEL);
  }
  const plainGpt = ids.filter((id) => /^gpt-\d+(\.\d+)?$/.test(id)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return plainGpt[0] ?? ids.find((id) => id.startsWith('gpt-')) ?? ids[0] ?? 'gpt-5';
}
