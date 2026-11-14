import { useEffect, useRef, useState, useCallback } from 'react'
import { Bold, Italic, RemoveFormatting, Type, Underline } from 'lucide-react'
import {
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  isContentEmpty,
} from './richText'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Registre suas anotações, aprendizados, reflexões ou uma citação marcante...',
  className = '',
  minHeight = '96px',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const savedRangeRef = useRef<Range | null>(null)

  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [currentFontSize, setCurrentFontSize] = useState<string>(DEFAULT_FONT_SIZE)
  const [isEditorFocused, setIsEditorFocused] = useState(false)

  // Salva a seleção ativa no editor para quando o usuário interagir com a barra de ferramentas
  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0 && editorRef.current) {
      const range = selection.getRangeAt(0)
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange()
      }
    }
  }, [])

  // Restaura a seleção guardada
  const restoreSelection = useCallback(() => {
    if (savedRangeRef.current && editorRef.current) {
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(savedRangeRef.current)
      }
    }
  }, [])

  // Atualiza os estados ativos de negrito, itálico, sublinhado e tamanho de fonte baseado no cursor
  const updateActiveFormats = useCallback(() => {
    if (!editorRef.current) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const anchor = selection.anchorNode
    if (!anchor || !editorRef.current.contains(anchor)) return

    try {
      setIsBold(document.queryCommandState('bold'))
      setIsItalic(document.queryCommandState('italic'))
      setIsUnderline(document.queryCommandState('underline'))
    } catch {
      // Ignora se não for suportado em algum contexto
    }

    // Detecta tamanho da fonte ativo no nó do cursor
    let el: HTMLElement | null =
      anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as HTMLElement)

    let detectedSize = DEFAULT_FONT_SIZE
    while (el && el !== editorRef.current) {
      if (el.style && el.style.fontSize) {
        detectedSize = el.style.fontSize
        break
      }
      el = el.parentElement
    }
    setCurrentFontSize(detectedSize)
  }, [])

  // Dispara a sincronização de conteúdo com o estado do React
  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    const cleanValue = isContentEmpty(html) ? '' : html
    onChange(cleanValue)
    updateActiveFormats()
    saveSelection()
  }, [onChange, updateActiveFormats, saveSelection])

  // Aplica tamanho de fonte
  const handleFontSizeChange = (sizePx: string) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    restoreSelection()

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    if (!selection.isCollapsed) {
      // Texto selecionado: aplica via execCommand('fontSize', '7') e converte para span com px
      document.execCommand('styleWithCSS', false, 'false')
      document.execCommand('fontSize', false, '7')

      const fonts = editorRef.current.querySelectorAll('font[size="7"]')
      fonts.forEach((font) => {
        const span = document.createElement('span')
        span.style.fontSize = sizePx
        span.innerHTML = font.innerHTML
        font.parentNode?.replaceChild(span, font)
      })
    } else {
      // Cursor sem texto selecionado
      const range = selection.getRangeAt(0)
      let parent = range.commonAncestorContainer.parentElement
      let existingSpan: HTMLElement | null = null

      while (parent && parent !== editorRef.current) {
        if (parent.tagName === 'SPAN' && parent.style.fontSize) {
          existingSpan = parent
          break
        }
        parent = parent.parentElement
      }

      if (existingSpan) {
        existingSpan.style.fontSize = sizePx
      } else {
        const span = document.createElement('span')
        span.style.fontSize = sizePx
        const zwsp = document.createTextNode('\u200B')
        span.appendChild(zwsp)
        range.insertNode(span)

        const newRange = document.createRange()
        newRange.setStart(zwsp, 1)
        newRange.collapse(true)
        selection.removeAllRanges()
        selection.addRange(newRange)
      }
    }

    setCurrentFontSize(sizePx)
    handleInput()
  }

  // Executa comandos de formatação básica
  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (!editorRef.current) return
    editorRef.current.focus()
    restoreSelection()
    document.execCommand(command, false, arg)
    handleInput()
    updateActiveFormats()
  }

  // Tratamento de colagem (cola como texto puro limpo, evitando scripts e estilos externos estranhos)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
    handleInput()
  }

  // Sincroniza valor recebido de fora (ex: abertura para edição ou reset)
  useEffect(() => {
    if (editorRef.current) {
      const currentHtml = editorRef.current.innerHTML
      const isCurrentlyEmpty = isContentEmpty(currentHtml)
      const isNewEmpty = isContentEmpty(value)

      if (isNewEmpty && !isCurrentlyEmpty) {
        editorRef.current.innerHTML = ''
        setCurrentFontSize(DEFAULT_FONT_SIZE)
      } else if (!isNewEmpty && value !== currentHtml) {
        if (document.activeElement !== editorRef.current) {
          editorRef.current.innerHTML = value
          updateActiveFormats()
        }
      }
    }
  }, [value, updateActiveFormats])

  const isEmpty = isContentEmpty(value)

  return (
    <div
      className={`flex flex-col bg-slate-950 border rounded-xl overflow-hidden transition ${
        isEditorFocused ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-800'
      } ${className}`}
    >
      {/* Barra de Ferramentas */}
      <div
        className="flex items-center flex-wrap gap-1 px-2.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-xs select-none"
        onMouseDown={saveSelection}
      >
        {/* Seletor de Tamanho de Fonte */}
        <div className="flex items-center gap-1.5 pr-1 mr-1 border-r border-slate-800">
          <Type className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={currentFontSize}
            onMouseDown={saveSelection}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-medium focus:outline-hidden focus:border-emerald-500 cursor-pointer transition"
            title="Tamanho da fonte"
          >
            {FONT_SIZES.map((fs) => (
              <option key={fs.value} value={fs.value}>
                {fs.label}
              </option>
            ))}
          </select>
        </div>

        {/* Negrito */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            saveSelection()
          }}
          onClick={() => executeCommand('bold')}
          className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            isBold
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>

        {/* Itálico */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            saveSelection()
          }}
          onClick={() => executeCommand('italic')}
          className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            isItalic
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        {/* Sublinhado */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            saveSelection()
          }}
          onClick={() => executeCommand('underline')}
          className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
            isUnderline
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
          title="Sublinhado (Ctrl+U)"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>

        {/* Limpar formatação */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault()
            saveSelection()
          }}
          onClick={() => executeCommand('removeFormat')}
          className="p-1.5 ml-auto rounded-lg border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Limpar formatação da seleção"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Área Editável */}
      <div className="relative flex-1">
        {isEmpty && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute top-2.5 left-3 text-xs text-slate-500 pointer-events-none select-none leading-relaxed"
          >
            {placeholder}
          </div>
        )}

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onFocus={() => {
            setIsEditorFocused(true)
            updateActiveFormats()
          }}
          onBlur={() => {
            setIsEditorFocused(false)
            saveSelection()
          }}
          onInput={handleInput}
          onPaste={handlePaste}
          onMouseUp={() => {
            saveSelection()
            updateActiveFormats()
          }}
          onKeyUp={() => {
            saveSelection()
            updateActiveFormats()
          }}
          style={{ minHeight }}
          className="rich-text-content px-3 py-2.5 text-xs text-slate-100 focus:outline-hidden whitespace-pre-wrap break-words leading-relaxed overflow-y-auto max-h-48"
        />
      </div>
    </div>
  )
}
