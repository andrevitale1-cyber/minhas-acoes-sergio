import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TypingPrompt } from "./TypingPrompt";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("types one character every 18ms and stops after the phrase", () => {
  vi.useFakeTimers();
  const { container, unmount } = render(<TypingPrompt text="Opinião" />);
  const visible = () => container.querySelector(".grid")?.lastElementChild?.textContent;
  expect(visible()).toBe("");
  act(() => {
    vi.advanceTimersByTime(54);
  });
  expect(visible()).toBe("Opi");
  act(() => {
    vi.advanceTimersByTime(200);
  });
  expect(visible()).toBe("Opinião");
  expect(vi.getTimerCount()).toBe(0);
  unmount();
});
it("restarts typing when the phrase changes and cleans up on unmount", () => {
  vi.useFakeTimers();
  const { container, rerender, unmount } = render(<TypingPrompt text="Primeira" />);
  act(() => {
    vi.advanceTimersByTime(200);
  });
  rerender(<TypingPrompt text="Segunda" />);
  expect(container.querySelector(".grid")?.lastElementChild?.textContent).toBe("");
  act(() => {
    vi.advanceTimersByTime(36);
  });
  expect(container.querySelector(".grid")?.lastElementChild?.textContent).toBe("Se");
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
it("shows the full phrase immediately when reduced motion is preferred", () => {
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  const { container } = render(<TypingPrompt text="Sua opinião" />);
  expect(container.querySelector(".grid")?.lastElementChild?.textContent).toBe("Sua opinião");
});

