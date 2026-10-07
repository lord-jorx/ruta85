import type { ReactNode } from 'react'
import { Collapsible, Icon } from '../components'
import { GUIDE } from '../data/guide'
import type { GuideSection } from '../data/guide'
import '../styles/screens-guide.css'

type Block = GuideSection['blocks'][number]

/** Negrita con **…**. Todo lo demás es texto plano (nodos React, sin HTML). */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : part))}
    </>
  )
}

/** Un string de tabla markdown empieza por "|". */
const isTableLine = (b: Block) => typeof b === 'string' && b.trimStart().startsWith('|')

/** Fila "|---|---|": todas las celdas son guiones (con o sin dos puntos de alineación). */
const isSeparator = (cells: string[]) => cells.every((c) => /^:?-{2,}:?$/.test(c))

function parseRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
}

/** Primera fila = cabecera; el resto, cuerpo. */
function GuideTable({ rows }: { rows: string[][] }) {
  const [head = [], ...body] = rows
  return (
    <div className="guide-table-wrap">
      <table className="guide-table">
        <thead>
          <tr>
            {head.map((c, j) => (
              <th key={j} scope="col">
                <Inline text={c} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>
                  <Inline text={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderBlocks(blocks: Block[]): ReactNode[] {
  const items = blocks.filter((b) => b !== '')
  const nodes: ReactNode[] = []
  let i = 0
  while (i < items.length) {
    const b = items[i]
    if (typeof b === 'string' && isTableLine(b)) {
      const rows: string[][] = []
      for (; i < items.length; i++) {
        const line = items[i]
        if (typeof line !== 'string' || !isTableLine(line)) break
        const cells = parseRow(line)
        if (!isSeparator(cells)) rows.push(cells)
      }
      nodes.push(<GuideTable key={nodes.length} rows={rows} />)
    } else if (typeof b === 'string') {
      nodes.push(
        <p key={nodes.length}>
          <Inline text={b} />
        </p>,
      )
      i++
    } else if ('list' in b) {
      nodes.push(
        <ul key={nodes.length} className="bullets">
          {b.list.map((t, j) => (
            <li key={j}>
              <Inline text={t} />
            </li>
          ))}
        </ul>,
      )
      i++
    } else {
      nodes.push(<GuideTable key={nodes.length} rows={b.table} />)
      i++
    }
  }
  return nodes
}

export function Guide() {
  return (
    <div className="stack">
      <p className="muted">Lo esencial del plan, a mano. Toca una sección para abrirla.</p>
      <div className="coll-list">
        {GUIDE.map((s, idx) => (
          <Collapsible key={s.id} title={s.title} defaultOpen={idx === 0}>
            <div className="prose">{renderBlocks(s.blocks)}</div>
          </Collapsible>
        ))}
      </div>
      <p className="muted small guide__note">
        <Icon name="guia" size={16} /> Esta guía es una orientación práctica, no consejo médico. Si la rodilla duele más de lo esperado, consulta con tu fisio.
      </p>
    </div>
  )
}
