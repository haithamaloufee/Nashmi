"use client";

import { forwardRef, useLayoutEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  disabled?: boolean;
  className?: string;
};

// A message is free-form text, not an account, payment or address field.
const MessageInput = forwardRef<HTMLTextAreaElement, Props>(function MessageInput({ value, onChange, placeholder, label, disabled, className }, forwardedRef) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const element = localRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(120, Math.max(44, element.scrollHeight + 2))}px`;
  }, [value]);

  return <textarea
    ref={element => {
      localRef.current = element;
      if (typeof forwardedRef === "function") forwardedRef(element);
      else if (forwardedRef) forwardedRef.current = element;
    }}
    name="nashmi-message"
    rows={1}
    value={value}
    onChange={event => onChange(event.target.value)}
    onKeyDown={event => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    }}
    autoComplete="off"
    autoCapitalize="sentences"
    inputMode="text"
    enterKeyHint="send"
    spellCheck
    maxLength={1500}
    disabled={disabled}
    placeholder={placeholder}
    aria-label={label}
    className={`min-w-0 flex-1 resize-none overflow-y-auto overscroll-contain rounded-2xl border border-slate-300 bg-white px-4 py-2 text-base leading-6 text-slate-900 placeholder:text-slate-400 focus:border-civic focus:ring-civic dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 sm:text-sm ${className || ""}`}
  />;
});

export default MessageInput;
