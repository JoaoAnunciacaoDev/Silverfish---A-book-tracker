export interface FontSizeOption {
  label: string
  value: string
}

export const FONT_SIZES: FontSizeOption[] = [
  { label: 'Pequeno (12px)', value: '12px' },
  { label: 'Normal (14px)', value: '14px' },
  { label: 'Grande (18px)', value: '18px' },
  { label: 'Extra Grande (22px)', value: '22px' },
]

export const DEFAULT_FONT_SIZE = '14px'

/**
 * Verifica se o conteúdo HTML ou texto está vazio (desconsiderando tags, espaços e zero-width chars).
 */
export function isContentEmpty(html: string | null | undefined): boolean {
  if (!html) return true
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
  return text.length === 0
}

/**
 * Remove tags HTML e espaços desnecessários para contagem de texto e prévias.
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
}

/**
 * Sanitiza o HTML para permitir com segurança apenas formatações básicas:
 * b, strong, i, em, u, span (com style font-size), p, div, br, font (com size).
 * Remove scripts, event handlers, iframes e estilos maliciosos.
 */
export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return ''

  // Se não contém tags HTML, retorna o texto puro
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return html
  }

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const allowedTags = new Set([
    'B',
    'STRONG',
    'I',
    'EM',
    'U',
    'SPAN',
    'P',
    'DIV',
    'BR',
    'FONT',
    'BLOCKQUOTE',
    'CENTER',
  ])

  function cleanNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) return

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.parentNode?.removeChild(node)
      return
    }

    const el = node as HTMLElement
    const tagName = el.tagName.toUpperCase()

    if (!allowedTags.has(tagName)) {
      // Desembrulha filhos e remove a tag proibida
      const parent = el.parentNode
      if (!parent) return
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el)
      }
      parent.removeChild(el)
      return
    }

    // Filtrar atributos
    const attrs = Array.from(el.attributes)
    for (const attr of attrs) {
      const name = attr.name.toLowerCase()
      if (tagName === 'FONT' && name === 'size') {
        continue
      }
      if (name === 'align') {
        const val = attr.value.toLowerCase()
        if (['left', 'center', 'right', 'justify'].includes(val)) {
          el.setAttribute('align', val)
        } else {
          el.removeAttribute('align')
        }
        continue
      }
      if (name === 'style') {
        const rawFontSize = el.style.fontSize
        const rawTextAlign = el.style.textAlign
        const rawMarginLeft = el.style.marginLeft
        const rawPaddingLeft = el.style.paddingLeft

        el.removeAttribute('style')
        if (rawFontSize) {
          // Permite apenas font-size
          el.style.fontSize = rawFontSize
        }
        if (
          rawTextAlign &&
          ['left', 'center', 'right', 'justify'].includes(rawTextAlign.toLowerCase())
        ) {
          el.style.textAlign = rawTextAlign.toLowerCase()
        }
        if (rawMarginLeft && /^[\d.]+(px|em|rem|%)?$/.test(rawMarginLeft.trim())) {
          el.style.marginLeft = rawMarginLeft.trim()
        }
        if (rawPaddingLeft && /^[\d.]+(px|em|rem|%)?$/.test(rawPaddingLeft.trim())) {
          el.style.paddingLeft = rawPaddingLeft.trim()
        }
        continue
      }
      // Remove qualquer outro atributo suspeito
      el.removeAttribute(attr.name)
    }

    // Limpa filhos recursivamente
    const children = Array.from(el.childNodes)
    for (const child of children) {
      cleanNode(child)
    }
  }

  Array.from(doc.body.childNodes).forEach(cleanNode)
  return doc.body.innerHTML
}
