import type { SyntheticEvent } from "react";

const PLACEHOLDER_SVG = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400' preserveAspectRatio='xMidYMid slice'>
  <rect width='400' height='400' fill='#0f172a'/>
  <rect x='64' y='92' width='272' height='214' rx='18' fill='#1e293b'/>
  <circle cx='146' cy='171' r='24' fill='#94a3b8'/>
  <path d='M98 272l66-66 50 43 42-41 46 64H98z' fill='#64748b'/>
  <text x='200' y='347' fill='#cbd5e1' font-size='28' text-anchor='middle' font-family='Arial,sans-serif'>No image</text>
</svg>
`.trim();

export const ITEM_IMAGE_PLACEHOLDER_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  PLACEHOLDER_SVG
)}`;

export function resolveItemImageSrc(imageUrl: string | null | undefined): string {
  const trimmed = imageUrl?.trim();
  return trimmed ? trimmed : ITEM_IMAGE_PLACEHOLDER_SRC;
}

export function handleItemImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const image = event.currentTarget;
  image.onerror = null;
  image.src = ITEM_IMAGE_PLACEHOLDER_SRC;
}
