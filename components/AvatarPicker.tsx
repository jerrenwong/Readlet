import { AVATARS } from "@/lib/avatars";
import { CatAvatar } from "./Cat";

export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-extrabold">Avatar</legend>
      <div className="grid grid-cols-4 gap-2">
        {AVATARS.map((a) => (
          <label
            key={a.id}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 p-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
              value === a.id ? "border-primary bg-primary/10" : "border-transparent"
            }`}
          >
            <input
              type="radio"
              name="avatar"
              value={a.id}
              checked={value === a.id}
              onChange={() => onChange(a.id)}
              className="sr-only"
            />
            <CatAvatar avatar={a.id} size={52} />
            <span className="sr-only">{a.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
