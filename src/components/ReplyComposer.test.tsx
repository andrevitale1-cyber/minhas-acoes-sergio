import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReplyComposer } from "./ReplyComposer";
afterEach(cleanup);
function setup(busy = false) {
  const dismiss = vi.fn();
  const submit = vi.fn().mockResolvedValue(undefined);
  const result = render(
    <>
      <button>Fora</button>
      <ReplyComposer
        author="Sérgio"
        value="Minha resposta"
        onChange={vi.fn()}
        onDismiss={dismiss}
        onSubmit={submit}
        busy={busy}
      />
    </>,
  );
  return { ...result, dismiss, submit };
}
it("dismisses on an outside pointer press, but keeps editor and formatting clicks inside", () => {
  const { dismiss } = setup();
  expect(screen.getByRole("form", { name: "Responder a Sérgio" })).toBeInTheDocument();
  fireEvent.pointerDown(screen.getByRole("textbox"));
  fireEvent.pointerDown(screen.getByRole("button", { name: "Negrito" }));
  expect(dismiss).not.toHaveBeenCalled();
  fireEvent.pointerDown(screen.getByRole("button", { name: "Fora" }));
  expect(dismiss).toHaveBeenCalledTimes(1);
});
it("supports explicit cancel and Escape", () => {
  const { dismiss } = setup();
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Cancelar resposta" }));
  expect(dismiss).toHaveBeenCalledTimes(2);
});
it("does not dismiss or submit again while a reply is saving", () => {
  const { dismiss, submit } = setup(true);
  fireEvent.pointerDown(screen.getByRole("button", { name: "Fora" }));
  fireEvent.keyDown(document, { key: "Escape" });
  fireEvent.submit(screen.getByRole("form"));
  expect(dismiss).not.toHaveBeenCalled();
  expect(submit).not.toHaveBeenCalled();
});
it("removes document listeners when unmounted", () => {
  const { unmount, dismiss } = setup();
  unmount();
  fireEvent.pointerDown(document.body);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(dismiss).not.toHaveBeenCalled();
});
