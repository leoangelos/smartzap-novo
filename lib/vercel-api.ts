/**
 * Cliente para a API REST do Vercel.
 *
 * Responsabilidades:
 * - Gravar environment variables no projeto (para BYOK via AI Gateway)
 * - Disparar redeploy após mudança de env vars
 * - Consultar status de deployment em andamento
 *
 * Requer as variáveis: VERCEL_API_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID
 */

const VERCEL_API = 'https://api.vercel.com'

// Mapeamento provider → nome da env var que o AI Gateway lê automaticamente
export const PROVIDER_ENV_VAR: Record<string, string> = {
    google: 'GOOGLE_GENERATIVE_AI_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
}

export type DeployStatus = 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED'

function getConfig() {
    const token = process.env.VERCEL_API_TOKEN
    const projectId = process.env.VERCEL_PROJECT_ID ?? 'prj_t74m8dEfJzTfuIDEwnhfXoTY5pfx'
    const teamId = process.env.VERCEL_TEAM_ID ?? 'team_GUT7m6INuJVIxmlVzOnuiRyY'
    return { token, projectId, teamId }
}

export function isVercelApiConfigured(): boolean {
    return !!process.env.VERCEL_API_TOKEN
}

/**
 * Cria ou atualiza uma environment variable no projeto Vercel.
 *
 * @param key   Nome da variável (ex: "OPENAI_API_KEY")
 * @param value Valor a persistir
 * @param target Ambientes alvo (default: production + preview + development)
 */
export async function setEnvVar(
    key: string,
    value: string,
    target: string[] = ['production', 'preview', 'development'],
): Promise<void> {
    const { token, projectId, teamId } = getConfig()
    if (!token) throw new Error('[Vercel API] VERCEL_API_TOKEN não configurado.')

    const url = `${VERCEL_API}/v10/projects/${projectId}/env?teamId=${teamId}&upsert=true`
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, value, type: 'encrypted', target }),
    })

    if (!res.ok) {
        const body = await res.text()
        throw new Error(`[Vercel API] Falha ao gravar env var "${key}": ${res.status} — ${body}`)
    }
}

/**
 * Persiste a chave de API de um provider como env var no Vercel.
 * O AI Gateway lê essas variáveis automaticamente para BYOK.
 */
export async function setProviderApiKey(provider: string, apiKey: string): Promise<void> {
    const envVar = PROVIDER_ENV_VAR[provider]
    if (!envVar) throw new Error(`[Vercel API] Provider desconhecido: "${provider}"`)
    await setEnvVar(envVar, apiKey)
}

/**
 * Dispara um redeploy no Vercel.
 *
 * Tenta o deploy hook primeiro (mais simples). Se não configurado,
 * usa a API REST para redeployar o último deployment de produção.
 *
 * @returns ID do novo deployment criado (ou '' para deploy hook)
 */
export async function triggerRedeploy(): Promise<string> {
    // Preferir deploy hook quando disponível — mais simples e sem permissões extras
    const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL
    if (deployHookUrl) {
        const res = await fetch(deployHookUrl, { method: 'POST' })
        if (!res.ok) {
            const body = await res.text()
            throw new Error(`[Vercel API] Deploy hook falhou: ${res.status} — ${body}`)
        }
        const data = await res.json() as { job?: { id?: string } }
        return data?.job?.id ?? ''
    }

    // Fallback: API REST — encontra o último deployment de produção e redeployar
    const { token, projectId, teamId } = getConfig()
    if (!token) throw new Error('[Vercel API] VERCEL_API_TOKEN não configurado.')

    // 1. Busca último deployment de produção
    const listUrl = `${VERCEL_API}/v6/deployments?projectId=${projectId}&teamId=${teamId}&target=production&limit=1`
    const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!listRes.ok) {
        throw new Error(`[Vercel API] Falha ao listar deployments: ${listRes.status}`)
    }
    const listData = await listRes.json() as { deployments?: Array<{ uid: string }> }
    const lastDeploymentId = listData.deployments?.[0]?.uid
    if (!lastDeploymentId) throw new Error('[Vercel API] Nenhum deployment de produção encontrado.')

    // 2. Redeployar
    const redeployUrl = `${VERCEL_API}/v13/deployments?teamId=${teamId}&forceNew=1`
    const redeployRes = await fetch(redeployUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deploymentId: lastDeploymentId, target: 'production' }),
    })
    if (!redeployRes.ok) {
        const body = await redeployRes.text()
        throw new Error(`[Vercel API] Falha ao disparar redeploy: ${redeployRes.status} — ${body}`)
    }
    const redeployData = await redeployRes.json() as { id?: string }
    return redeployData.id ?? ''
}

/**
 * Consulta o status atual de um deployment.
 */
export async function getDeploymentStatus(deploymentId: string): Promise<DeployStatus> {
    const { token, teamId } = getConfig()
    if (!token) throw new Error('[Vercel API] VERCEL_API_TOKEN não configurado.')
    if (!deploymentId) return 'QUEUED'

    const url = `${VERCEL_API}/v13/deployments/${deploymentId}?teamId=${teamId}`
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`[Vercel API] Falha ao consultar deployment: ${res.status}`)

    const data = await res.json() as { readyState?: string }
    const state = data.readyState?.toUpperCase() ?? 'QUEUED'

    // Normaliza para DeployStatus
    if (state === 'READY') return 'READY'
    if (state === 'ERROR') return 'ERROR'
    if (state === 'CANCELED') return 'CANCELED'
    if (state === 'BUILDING' || state === 'INITIALIZING') return 'BUILDING'
    return 'QUEUED'
}
