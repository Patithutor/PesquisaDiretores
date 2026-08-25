"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { findLeader, leaderGroups, leaders, matchesLeader, type Leader } from "./leaders";

type Props = {
  value: string;
  onChange: (leaderName: string) => void;
};

export default function LeaderCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = findLeader(value);

  // Enquanto o campo está fechado ele mostra o nome escolhido; ao digitar, o
  // texto vira a busca. Um rascunho restaurado também precisa refletir aqui.
  useEffect(() => {
    if (!open) setQuery(value);
  }, [open, value]);

  // Com a escolha já feita e intocada, mostra a lista inteira para navegar.
  const searching = open && query !== value;

  // Os grupos preservam a ordem do lotacionograma; a navegação por teclado
  // corre a lista achatada, por isso cada opção carrega o índice global.
  const groups = useMemo(() => {
    let index = 0;
    return leaderGroups
      .map((group) => ({
        area: group.area,
        options: group.leaders
          .filter((leader) => !searching || matchesLeader(leader, query))
          .map((leader) => ({ leader, index: index++ })),
      }))
      .filter((group) => group.options.length > 0);
  }, [query, searching]);

  const results = useMemo(
    () => groups.flatMap((group) => group.options.map((option) => option.leader)),
    [groups],
  );

  useEffect(() => {
    setHighlighted((previous) => Math.min(previous, Math.max(results.length - 1, 0)));
  }, [results.length]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-highlighted="true"]')?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function openList() {
    if (!open) {
      setOpen(true);
      const index = leaders.findIndex((leader) => leader.name === value);
      setHighlighted(index >= 0 ? index : 0);
    }
  }

  function select(leader: Leader) {
    onChange(leader.name);
    setQuery(leader.name);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList();
        return;
      }
      if (results.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((previous) => (previous + step + results.length) % results.length);
      return;
    }

    if (event.key === "Enter" && open) {
      const leader = results[highlighted];
      if (leader) {
        event.preventDefault();
        select(leader);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setQuery(value);
      return;
    }

    // Tab sai do campo: descarta a busca a meio caminho e mantém a escolha.
    if (event.key === "Tab" && open) {
      setOpen(false);
      setQuery(value);
    }
  }

  return (
    <div className="combobox" ref={containerRef}>
      <input
        id="leaderName"
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[highlighted] ? `${listId}-${highlighted}` : undefined}
        autoComplete="off"
        placeholder="Digite para buscar pelo nome ou pelo cargo"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlighted(0);
          if (!open) setOpen(true);
        }}
        onFocus={openList}
        onClick={openList}
        onKeyDown={handleKeyDown}
      />
      <span className="combobox-arrow" aria-hidden="true" />

      {open && (
        <div className="combobox-list" id={listId} role="listbox" ref={listRef} aria-label="Líderes">
          {results.length === 0 && (
            <p className="combobox-empty">Nenhum líder encontrado para “{query.trim()}”.</p>
          )}
          {groups.map((group) => (
            <div className="combobox-group" role="group" aria-label={group.area} key={group.area}>
              <p className="combobox-group-label" aria-hidden="true">
                {group.area}
              </p>
              {group.options.map(({ leader, index }) => (
                <div
                  key={leader.name}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={leader.name === value}
                  data-highlighted={index === highlighted}
                  className="combobox-option"
                  // pointerdown em vez de click: o clique chegaria depois do blur.
                  onPointerDown={(event) => {
                    event.preventDefault();
                    select(leader);
                  }}
                  onPointerEnter={() => setHighlighted(index)}
                >
                  <b>{leader.name}</b>
                  <span>{leader.role}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {selected && !open && (
        <p className="combobox-hint">
          {selected.role} • {selected.area}
        </p>
      )}
    </div>
  );
}
