import { avatarGradient } from "@/lib/hue";
import { cn } from "@/lib/cn";

export function Avatar({
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
  const letter = (name || "S").charAt(0).toUpperCase();
  const dim = size === "lg" ? "h-[72px] w-[72px] text-2xl" : size === "sm" ? "h-8 w-8 text-xs" : "h-12 w-12 text-base";
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-fg",
        dim,
        live && "avatar-live",
      )}
      style={{ background: avatarGradient(hue) }}
    >
      {letter}
    </span>
  );
}
