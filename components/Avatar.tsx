import { COLOR_IDS, colorHex } from "@/lib/colors";

/** First letter of the display name on the user's color. */
export function Avatar({ name, color, size = 36 }: { name: string; color?: string | null; size?: number }) {
  const letter = (name.trim().match(/\p{L}|\p{N}/u)?.[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-extrabold text-white"
      style={{ width: size, height: size, background: colorHex(color), fontSize: Math.round(size * 0.45) }}
    >
      {letter}
    </span>
  );
}

export function ColorPicker({ value, onChange, name }: { value: string; onChange: (c: string) => void; name: string }) {
  return (
    <fieldset>
      <legend className="mb-2 font-extrabold">Color</legend>
      <div className="flex flex-wrap gap-2">
        {COLOR_IDS.map((c) => (
          <label
            key={c}
            className={`cursor-pointer rounded-full p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-text ${
              value === c ? "ring-3 ring-text" : ""
            }`}
          >
            <input type="radio" name="color" value={c} checked={value === c} onChange={() => onChange(c)} className="sr-only" />
            <span className="sr-only">{c}</span>
            <Avatar name={name || "?"} color={c} size={40} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
