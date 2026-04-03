/**
 * AI Providers Configuration
 * 
 * Modelos EXATOS conforme especificado pelo usuário.
 * Links de referência:
 * - Google: https://ai-sdk.dev/providers/ai-sdk-providers/google-generative-ai
 * - OpenAI: https://ai-sdk.dev/providers/ai-sdk-providers/openai
 * - Anthropic: https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
 */

export type AIProvider = 'google' | 'openai' | 'anthropic';

export interface AIModel {
    id: string;
    name: string;
    description?: string;
}

export interface AIProviderConfig {
    id: AIProvider;
    name: string;
    icon: string;
    models: AIModel[];
}

export const AI_PROVIDERS: AIProviderConfig[] = [
    {
        id: 'google',
        name: 'Google (Gemini)',
        icon: '💎',
        models: [
            // Flash primeiro = default (mais rápido e barato)
            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: 'Rápido e responsivo (preview) - RECOMENDADO' },
            { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', description: 'Modelo mais avançado (preview)' },
            { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Melhor para tarefas complexas' },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Rápido e eficiente' },
            { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Ultra-rápido, baixo custo' },
        ],
    },
    {
        id: 'openai',
        name: 'OpenAI (GPT)',
        icon: '🤖',
        models: [
            { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro', description: 'Máxima capacidade (mais recente)' },
            { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Chat Latest', description: 'Chat otimizado (mais recente)' },
            { id: 'gpt-5', name: 'GPT-5', description: 'Modelo principal' },
            { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: 'Rápido e econômico' },
            { id: 'gpt-5-nano', name: 'GPT-5 Nano', description: 'Ultra-compacto' },
        ],
    },
    {
        id: 'anthropic',
        name: 'Anthropic (Claude)',
        icon: '🧠',
        models: [
            { id: 'claude-opus-4.5', name: 'Claude Opus 4.5', description: 'Máxima inteligência' },
            { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5', description: 'Equilíbrio performance/custo' },
            { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', description: 'Rápido e leve' },
        ],
    },
];

/**
 * Get provider config by ID
 */
export function getProvider(providerId: AIProvider): AIProviderConfig | undefined {
    return AI_PROVIDERS.find(p => p.id === providerId);
}

/**
 * Get model config by ID
 */
export function getModel(providerId: AIProvider, modelId: string): AIModel | undefined {
    const provider = getProvider(providerId);
    return provider?.models.find(m => m.id === modelId);
}

/**
 * Get default model for a provider
 */
export function getDefaultModel(providerId: AIProvider): AIModel | undefined {
    const provider = getProvider(providerId);
    return provider?.models[0];
}
