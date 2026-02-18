import type { SyntheticEvent } from "react";

const DARK_PLACEHOLDER_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' preserveAspectRatio='xMidYMid slice'>
  <rect width='400' height='400' fill='#0f172a'/>
  <rect x='64' y='92' width='272' height='214' rx='18' fill='#1e293b'/>
  <circle cx='146' cy='171' r='24' fill='#94a3b8'/>
  <path d='M98 272l66-66 50 43 42-41 46 64H98z' fill='#64748b'/>
  <text x='200' y='347' fill='#cbd5e1' font-size='28' text-anchor='middle' font-family='Arial,sans-serif'>No image</text>
</svg>
`.trim();

const LIGHT_PLACEHOLDER_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' preserveAspectRatio='xMidYMid slice'>
  <rect width='400' height='400' fill='#f8fafc'/>
  <rect x='64' y='92' width='272' height='214' rx='18' fill='#e2e8f0'/>
  <circle cx='146' cy='171' r='24' fill='#94a3b8'/>
  <path d='M98 272l66-66 50 43 42-41 46 64H98z' fill='#64748b'/>
  <text x='200' y='347' fill='#334155' font-size='28' text-anchor='middle' font-family='Arial,sans-serif'>No image</text>
</svg>
`.trim();

export const ITEM_IMAGE_PLACEHOLDER_DARK_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  DARK_PLACEHOLDER_SVG
)}`;

export const ITEM_IMAGE_PLACEHOLDER_LIGHT_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  LIGHT_PLACEHOLDER_SVG
)}`;

function resolvePlaceholderForTheme(): string {
  const isDarkTheme = document.documentElement.classList.contains("dark");
  return isDarkTheme ? ITEM_IMAGE_PLACEHOLDER_DARK_SRC : ITEM_IMAGE_PLACEHOLDER_LIGHT_SRC;
}

export function resolveItemImageSrc(imageUrl: string | null | undefined): string {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : resolvePlaceholderForTheme();
}

export function handleItemImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = resolvePlaceholderForTheme();
}
