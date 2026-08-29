export function hueFrom(str: string): number {
  let n = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i) * 17) % 360;
  return n;
}

export function avatarGradient(hue: number): string {
  const h = ((hue % 360) + 360) % 360;
  return `linear-gradient(145deg, hsl(${h} 70% 42%), hsl(${(h + 40) % 360} 55% 22%))`;
}
