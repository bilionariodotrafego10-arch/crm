import type { WhatsappMensagem } from '@/lib/types'

export function BolhaMensagem({ mensagem }: { mensagem: WhatsappMensagem }) {
  const minha = mensagem.direcao === 'enviada'

  return (
    <div className={`flex ${minha ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs rounded-lg px-3 py-2 text-sm ${minha ? 'bg-primary text-primary-foreground' : 'bg-accent text-foreground'}`}>
        {mensagem.tipo === 'imagem' && mensagem.midia_url && (
          <img src={mensagem.midia_url} alt="Imagem recebida" className="rounded-md max-w-full" />
        )}
        {mensagem.tipo === 'audio' && mensagem.midia_url && (
          <audio controls src={mensagem.midia_url} className="max-w-full" />
        )}
        {mensagem.tipo === 'video' && mensagem.midia_url && (
          <video controls src={mensagem.midia_url} className="rounded-md max-w-full" />
        )}
        {mensagem.tipo === 'documento' && mensagem.midia_url && (
          <a
            href={mensagem.midia_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 underline break-all"
          >
            📄 {mensagem.conteudo_texto ?? 'Documento'}
          </a>
        )}
        {mensagem.tipo !== 'texto' && !mensagem.midia_url && (
          <p className="text-xs text-muted-foreground italic">Mídia não disponível</p>
        )}
        {mensagem.tipo !== 'documento' && mensagem.conteudo_texto && <p>{mensagem.conteudo_texto}</p>}
        {minha && mensagem.status_envio === 'enviando' && <p className="text-xs opacity-70 mt-1">Enviando...</p>}
        {minha && mensagem.status_envio === 'falhou' && <p className="text-xs text-destructive mt-1">Falha ao enviar</p>}
      </div>
    </div>
  )
}
