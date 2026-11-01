import { useEffect, useState } from "react";

export function TypingPrompt({ text }: { text: string }) {
  const [length, setLength] = useState(0);
  const letters = Array.from(text);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLength(Array.from(text).length);
      return;
    }
    setLength(0);
    let count = 0;
    const total = Array.from(text).length;
    const timer = window.setInterval(() => {
      count++;
      setLength(count);
      if (count >= total) window.clearInterval(timer);
    }, 18);
    return () => window.clearInterval(timer);
  }, [text]);
  return (
    <span aria-hidden="true" className="grid">
      <span className="invisible col-start-1 row-start-1">{text}</span>
      <span className="col-start-1 row-start-1">
        {letters.slice(0, length).join("")}
        {length < letters.length && (
          <span className="ml-0.5 inline-block h-[1em] translate-y-0.5 border-r border-current" />
        )}
      </span>
    </span>
  );
}
