import type { Pokemon } from "@/types";
import * as React from "react";

import Sprite from "./Sprite";

import pokedex from "@/pokedex.json";

const pokemon_by_name = new Map((pokedex as Pokemon[]).map(p => [p.name.toLowerCase(), p]))

export default function PokemonInput({ label, name, required }: { label: string, name: string, required?: boolean }) {
  // TODO: (Carter) this is slop. but by god does this slop work.
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Pokemon | null>(null);
  const [open, setOpen] = React.useState(false);
  const selectedRef = React.useRef<HTMLLIElement>(null);

  const suggestions = React.useMemo(() => {
    if (!query) return pokedex as Pokemon[];
    const q = query.toLowerCase();
    return (pokedex as Pokemon[]).filter(p =>
      p.name.toLowerCase().includes(q) || String(p.id).includes(q)
    );
  }, [query]);

  const valid = selected !== null && selected.name.toLowerCase() === query.toLowerCase();

  React.useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  function pick(pokemon: Pokemon) {
    setQuery(pokemon.name);
    setSelected(pokemon);
    setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    setSelected(pokemon_by_name.get(value.toLowerCase()) ?? null);
    setOpen(true);
  }

  return (
    <label>
      {label}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          autoComplete="off"
          placeholder="Search by name or number…"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-invalid={query.length > 0 && !valid ? true : undefined}
          style={{ marginBottom: 0 }}
          required={required ?? false}
        />
        <input
          type="hidden"
          name={name}
          value={valid ? selected!.id : ""}
        />

        {open && (
          <ul
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              maxHeight: "280px",
              overflowY: "auto",
              margin: 0,
              padding: "0.25rem",
              listStyle: "none",
              background: "var(--pico-card-background-color)",
              border: "1px solid var(--pico-muted-border-color)",
              borderRadius: "var(--pico-border-radius)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              zIndex: 100,
            }}
          >
            {suggestions.length === 0 ? (
              <li style={{ padding: "0.75rem", color: "var(--pico-muted-color)", textAlign: "center" }}>
                No Pokémon found
              </li>
            ) : suggestions.map(p => {
              const isSelected = selected?.id === p.id;
              return (
                <li
                  key={p.id}
                  ref={isSelected ? selectedRef : undefined}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={() => pick(p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.375rem 0.5rem",
                    borderRadius: "calc(var(--pico-border-radius) - 2px)",
                    cursor: "pointer",
                    background: isSelected ? "var(--pico-primary-background)" : "transparent",
                    color: isSelected ? "var(--pico-primary-inverse)" : "inherit",
                  }}
                >
                  <Sprite poke_id={p.id} />
                  <span>
                    <small style={{ opacity: 0.5 }}>#{String(p.id).padStart(3, "0")}</small>
                    {" "}{p.name}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </label>
  );
}
