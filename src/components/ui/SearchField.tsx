import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

export default function SearchField({ label, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <span className={`social-search relative block min-w-0 max-w-full ${className}`}>
    <Search aria-hidden="true" className="pointer-events-none absolute start-3 top-3 h-5 w-5 text-ink/60" />
    <input {...props} type="search" aria-label={label} className="social-search-input w-full pe-4 ps-10" />
  </span>;
}
