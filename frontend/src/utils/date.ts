export function formatFinishedDate(finishedAt?: string | null): string | null {
  if (!finishedAt) return null

  try {
    const d = new Date(finishedAt)
    if (isNaN(d.getTime())) return null

    // Verifica se foi salvo como indicação de ano apenas (01/01 às 12:00 UTC)
    const isYearOnly =
      finishedAt.includes('-01-01T12:00:00') ||
      (d.getUTCMonth() === 0 && d.getUTCDate() === 1 && d.getUTCHours() === 12 && d.getUTCMinutes() === 0)

    if (isYearOnly) {
      return `Lido em ${d.getUTCFullYear()}`
    }

    return `Lido em ${d.toLocaleDateString('pt-BR')}`
  } catch {
    return null
  }
}
