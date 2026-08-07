const BASE_URL = 'https://api.z-api.io'

export interface CredenciaisInstancia {
  instance_id: string
  token: string
  client_token: string
}

interface RespostaEnvioZApi {
  zaapId: string
  messageId: string
}

type ResultadoEnvio =
  | { ok: true; data: RespostaEnvioZApi }
  | { ok: false; erro: string }

async function chamarZApi(
  credenciais: CredenciaisInstancia,
  caminho: string,
  corpo: Record<string, unknown>
): Promise<ResultadoEnvio> {
  const url = `${BASE_URL}/instances/${credenciais.instance_id}/token/${credenciais.token}${caminho}`

  let resposta: Response
  try {
    resposta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': credenciais.client_token,
      },
      body: JSON.stringify(corpo),
    })
  } catch {
    return { ok: false, erro: 'Não foi possível conectar com a Z-API' }
  }

  if (!resposta.ok) {
    return { ok: false, erro: `Z-API respondeu ${resposta.status}` }
  }

  const data = (await resposta.json()) as RespostaEnvioZApi
  return { ok: true, data }
}

export function enviarTexto(credenciais: CredenciaisInstancia, telefone: string, mensagem: string) {
  return chamarZApi(credenciais, '/send-text', { phone: telefone, message: mensagem })
}

export function enviarImagem(credenciais: CredenciaisInstancia, telefone: string, imagemUrl: string, legenda?: string) {
  return chamarZApi(credenciais, '/send-image', { phone: telefone, image: imagemUrl, caption: legenda ?? '' })
}

export function enviarAudio(credenciais: CredenciaisInstancia, telefone: string, audioUrl: string) {
  return chamarZApi(credenciais, '/send-audio', { phone: telefone, audio: audioUrl })
}

export function enviarVideo(credenciais: CredenciaisInstancia, telefone: string, videoUrl: string, legenda?: string) {
  return chamarZApi(credenciais, '/send-video', { phone: telefone, video: videoUrl, caption: legenda ?? '' })
}

export function enviarDocumento(
  credenciais: CredenciaisInstancia,
  telefone: string,
  documentoUrl: string,
  nomeArquivo: string,
  extensao: string
) {
  return chamarZApi(credenciais, `/send-document/${extensao}`, { phone: telefone, document: documentoUrl, fileName: nomeArquivo })
}
