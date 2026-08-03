import { generateCSV } from '@/lib/csv'

describe('generateCSV', () => {
  it('inclui BOM UTF-8 para compatibilidade com Excel', () => {
    const csv = generateCSV([{ nome: 'João' }], ['nome'])
    expect(csv.startsWith('﻿')).toBe(true)
  })

  it('gera cabeçalho com colunas corretas', () => {
    const csv = generateCSV([], ['nome', 'telefone', 'email'])
    expect(csv).toContain('nome,telefone,email')
  })

  it('gera linha de dados corretamente', () => {
    const csv = generateCSV(
      [{ nome: 'Maria', telefone: '11999999999', email: 'maria@email.com' }],
      ['nome', 'telefone', 'email']
    )
    expect(csv).toContain('Maria,11999999999,maria@email.com')
  })

  it('trata campos com vírgula usando aspas duplas', () => {
    const csv = generateCSV([{ nome: 'Silva, João' }], ['nome'])
    expect(csv).toContain('"Silva, João"')
  })

  it('retorna apenas cabeçalho quando não há dados', () => {
    const csv = generateCSV([], ['nome'])
    const lines = csv.replace('﻿', '').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toBe('nome')
  })
})
