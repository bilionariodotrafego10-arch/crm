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

  it('escapa aspas duplas internas duplicando-as e envolvendo o campo em aspas', () => {
    const csv = generateCSV([{ nome: 'Ele disse "oi"' }], ['nome'])
    expect(csv).toContain('"Ele disse ""oi"""')
  })

  it('envolve em aspas campos com quebra de linha', () => {
    const csv = generateCSV([{ observacao: 'Linha 1\nLinha 2' }], ['observacao'])
    expect(csv).toContain('"Linha 1\nLinha 2"')
  })

  it('neutraliza valores que começam com caracteres de fórmula (CSV injection)', () => {
    const csv = generateCSV([{ nome: '=HYPERLINK("http://evil.com")' }], ['nome'])
    expect(csv).toContain("'=HYPERLINK")
    expect(csv).not.toMatch(/\n=HYPERLINK/)
  })

  it('neutraliza valores que começam com +, - ou @ e ainda aplica quoting quando necessário', () => {
    expect(generateCSV([{ nome: '+5511999999999' }], ['nome'])).toContain("'+5511999999999")
    expect(generateCSV([{ nome: '-1+1' }], ['nome'])).toContain("'-1+1")
    expect(generateCSV([{ nome: '@usuario' }], ['nome'])).toContain("'@usuario")

    const csvComVirgula = generateCSV([{ nome: '=1,2' }], ['nome'])
    expect(csvComVirgula).toContain('"\'=1,2"')
  })
})
