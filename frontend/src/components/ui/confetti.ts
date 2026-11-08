// Utilitário de confetes leve nativo usando Canvas HTML5 para celebrações no Silverfish

export function triggerConfetti() {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '99999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    document.body.removeChild(canvas)
    return
  }

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const colors = ['#10b981', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#f43f5e']
  const particleCount = 75
  const particles: Array<{
    x: number
    y: number
    size: number
    color: string
    vx: number
    vy: number
    rotation: number
    rotationSpeed: number
    opacity: number
  }> = []

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: canvas.width * (0.2 + Math.random() * 0.6),
      y: canvas.height * 0.4,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: -12 - Math.random() * 8,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
    })
  }

  let animationFrameId: number
  const startTime = Date.now()
  const duration = 2500

  function render() {
    if (!ctx) return
    const elapsed = Date.now() - startTime
    if (elapsed > duration) {
      cancelAnimationFrame(animationFrameId)
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas)
      }
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const gravity = 0.45
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += gravity
      p.rotation += p.rotationSpeed
      p.opacity = Math.max(0, 1 - elapsed / duration)

      ctx.save()
      ctx.globalAlpha = p.opacity
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    }

    animationFrameId = requestAnimationFrame(render)
  }

  render()
}
