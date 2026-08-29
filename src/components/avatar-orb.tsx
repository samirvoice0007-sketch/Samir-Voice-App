import { cn } from "@/lib/utils";

export function AvatarOrb({
  name,
  hue,
  size = "md",
  live = false,
}: {
  name: string;
  hue: number;
  size?: "sm" | "md" | "lg";
  live?: boolean;
}) {
  const dim = size === "lg" ? "h-16 w-16 text-xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-12 w-12 text-sm";
  const letter = (name || "?").charAt(0).toUpperCase();
  return (
    <div
      className={cn("grid place-items-center rounded-full font-semibold text-fg", dim, live && "seat-ring live")}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 70% 42%), hsl(${(hue + 40) % 360} 55% 22%))`,
      }}
    >
      {letter}
    </div>
  );
}
