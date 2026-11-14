import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../frontend/public');

// 1. Favicon SVG (otimizado para abas de navegador - alta nitidez em 16x16 e 32x32)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="strokeGrad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
  </defs>

  <!-- Fundo escuro arredondado (tema slate-950) -->
  <rect width="32" height="32" rx="8" fill="url(#bgGrad)"/>
  
  <!-- Borda suave verde esmeralda -->
  <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="7.25" stroke="#10b981" stroke-opacity="0.28" stroke-width="1.5"/>

  <!-- Placa interna esmeralda translúcida (estilo do app: bg-emerald-500/10) -->
  <rect x="3.5" y="3.5" width="25" height="25" rx="6" fill="#10b981" fill-opacity="0.12"/>

  <!-- Livrinho Lucide BookOpen perfeitamente proporcional -->
  <g transform="translate(4, 4)" stroke="url(#strokeGrad)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v16" />
    <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
  </g>
</svg>
`;

// 2. SVG padrão para PWA / App Icon (viewBox 512x512 com cantos arredondados)
const pwaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="pwaBgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="pwaBookGrad" x1="100" y1="100" x2="412" y2="412" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <radialGradient id="pwaGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Fundo escuro com cantos arredondados (Squircle suave) -->
  <rect width="512" height="512" rx="112" fill="url(#pwaBgGrad)"/>

  <!-- Brilho esmeralda de fundo -->
  <circle cx="256" cy="256" r="220" fill="url(#pwaGlow)"/>

  <!-- Borda externa suave -->
  <rect x="8" y="8" width="496" height="496" rx="104" stroke="#10b981" stroke-opacity="0.25" stroke-width="16"/>

  <!-- Placa interna no estilo do container do app -->
  <rect x="64" y="64" width="384" height="384" rx="84" fill="#10b981" fill-opacity="0.1" stroke="#10b981" stroke-opacity="0.2" stroke-width="8"/>

  <!-- Livro Lucide BookOpen centralizado (24 * 12.5 = 300px, centrado: (512 - 300)/2 = 106) -->
  <g transform="translate(106, 106) scale(12.5)" stroke="url(#pwaBookGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v16" />
    <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
  </g>
</svg>
`;

// 3. SVG Maskable para PWA Android (fundo sem cantos arredondados, margem segura de 20% em volta)
const pwaMaskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <defs>
    <linearGradient id="maskableBgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="maskableBookGrad" x1="120" y1="120" x2="392" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <radialGradient id="maskableGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Fundo contínuo (sangria total para qualquer corte circular/squircle do launcher) -->
  <rect width="512" height="512" fill="url(#maskableBgGrad)"/>

  <!-- Brilho esmeralda na safe zone -->
  <circle cx="256" cy="256" r="180" fill="url(#maskableGlow)"/>

  <!-- Placa interna na safe zone (80% central) -->
  <rect x="96" y="96" width="320" height="320" rx="72" fill="#10b981" fill-opacity="0.12" stroke="#10b981" stroke-opacity="0.3" stroke-width="8"/>

  <!-- Livro Lucide BookOpen dentro da safe zone (24 * 10 = 240px, centrado: (512 - 240)/2 = 136) -->
  <g transform="translate(136, 136) scale(10)" stroke="url(#maskableBookGrad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v16" />
    <path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />
  </g>
</svg>
`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg.trim(), 'utf-8');
console.log('✅ favicon.svg salvo com sucesso');

// Salva arquivos auxiliares para renderizar os PNGs
const tempDir = path.resolve(__dirname, '../temp_icons');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

fs.writeFileSync(path.join(tempDir, 'pwa.svg'), pwaSvg.trim(), 'utf-8');
fs.writeFileSync(path.join(tempDir, 'pwa-maskable.svg'), pwaMaskableSvg.trim(), 'utf-8');

// Cria páginas HTML simples para capturar com Edge headless no tamanho exato
function createHtml(svgContent, size) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;
}

fs.writeFileSync(path.join(tempDir, 'icon-192.html'), createHtml(pwaSvg, 192), 'utf-8');
fs.writeFileSync(path.join(tempDir, 'icon-512.html'), createHtml(pwaSvg, 512), 'utf-8');
fs.writeFileSync(path.join(tempDir, 'icon-apple.html'), createHtml(pwaSvg, 180), 'utf-8');
fs.writeFileSync(path.join(tempDir, 'icon-maskable.html'), createHtml(pwaMaskableSvg, 512), 'utf-8');

console.log('Arquivos temporários HTML criados em', tempDir);
