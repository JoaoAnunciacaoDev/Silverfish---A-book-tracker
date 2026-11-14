import { useMemo } from 'react'
import { sanitizeRichText } from './richText'

interface RichTextViewerProps {
  content: string | null | undefined
  className?: string
}

export function RichTextViewer({ content, className = '' }: RichTextViewerProps) {
  const isHtml = useMemo(() => Boolean(content && /<[a-z][\s\S]*>/i.test(content)), [content])
  const sanitized = useMemo(() => (isHtml && content ? sanitizeRichText(content) : ''), [content, isHtml])

  if (!content) return null

  if (!isHtml) {
    return (
      <div className={`rich-text-content text-slate-200 whitespace-pre-line leading-relaxed ${className}`}>
        {content}
      </div>
    )
  }

  return (
    <div
      className={`rich-text-content text-slate-200 leading-relaxed break-words whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
