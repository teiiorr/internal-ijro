"use client";
import { useRef, useState, useCallback, useEffect, type KeyboardEvent, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "./user-avatar";

export type MentionUser = { id: string; fullName: string; avatarUrl?: string | null };

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange?: (ids: string[]) => void;
  users: MentionUser[];
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  users,
  placeholder,
  rows = 3,
  className,
  disabled,
}: MentionTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);

  const filtered = query !== null
    ? users.filter((u) => u.fullName.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const open = query !== null && filtered.length > 0;

  const getMentionRange = useCallback((): { start: number; end: number; q: string } | null => {
    const el = ref.current;
    if (!el) return null;
    const pos = el.selectionStart;
    const before = value.slice(0, pos);
    const match = before.match(/@([\wЀ-ӿ']*)$/);
    if (!match) return null;
    return { start: pos - match[0].length, end: pos, q: match[1] };
  }, [value]);

  function updatePopupPosition() {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
    const lines = value.slice(0, el.selectionStart).split("\n").length;
    const top = Math.min(lines * lineHeight, el.clientHeight) + 4;
    setPopupPos({ top, left: 8 });
  }

  function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    onChange(newVal);

    setTimeout(() => {
      const range = getMentionRange();
      if (range) {
        setQuery(range.q);
        setSelectedIdx(0);
        updatePopupPosition();
      } else {
        setQuery(null);
      }
    }, 0);
  }

  function insertMention(user: MentionUser) {
    const range = getMentionRange();
    if (!range) return;
    const before = value.slice(0, range.start);
    const after = value.slice(range.end);
    const mention = `@${user.fullName} `;
    const newVal = before + mention + after;
    onChange(newVal);
    setQuery(null);

    const mentionIds = extractMentionIds(newVal, users);
    onMentionsChange?.(mentionIds);

    setTimeout(() => {
      const el = ref.current;
      if (el) {
        const cursor = range.start + mention.length;
        el.selectionStart = cursor;
        el.selectionEnd = cursor;
        el.focus();
      }
    }, 0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (filtered[selectedIdx]) insertMention(filtered[selectedIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery(null);
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setQuery(null);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={cn(
          "flex min-h-[112px] w-full rounded-2xl border border-[var(--input)] " +
          "bg-[var(--glass-fill-strong)] backdrop-blur-xl backdrop-saturate-180 " +
          "px-4 py-3 text-[15px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--subtle)] font-medium " +
          "resize-y " +
          "transition-[border-color,box-shadow] duration-200 " +
          "focus-visible:outline-none focus-visible:border-[var(--primary)] focus-visible:shadow-[0_0_0_2px_var(--primary-glow)] " +
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />

      {open && popupPos && (
        <div
          ref={popupRef}
          className="absolute z-50 w-64 max-h-56 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          {filtered.map((user, i) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
              onMouseEnter={() => setSelectedIdx(i)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                i === selectedIdx
                  ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                  : "hover:bg-[var(--surface-2)]",
              )}
            >
              <UserAvatar name={user.fullName} avatarUrl={user.avatarUrl} size="xs" clickable={false} />
              <span className="truncate font-medium">{user.fullName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function extractMentionIds(text: string, users: MentionUser[]): string[] {
  const ids = new Set<string>();
  for (const u of users) {
    if (text.includes(`@${u.fullName}`)) {
      ids.add(u.id);
    }
  }
  return Array.from(ids);
}
