import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CommentText } from "./CommentText";
import { CommentEditor } from "./CommentEditor";
afterEach(cleanup);
it("renders supported formatting without executing user HTML", () => {
  const { container } = render(
    <CommentText
      text={
        "# Título\n**forte** *ênfase* __sublinhado__\n> citação\n- item\n<img src=x onerror=alert(1)>"
      }
    />,
  );
  expect(container.querySelector("strong")).toHaveTextContent("forte");
  expect(container.querySelector("em")).toHaveTextContent("ênfase");
  expect(container.querySelector("u")).toHaveTextContent("sublinhado");
  expect(container.querySelector("blockquote")).toHaveTextContent("citação");
  expect(container.querySelector("img")).toBeNull();
  expect(container).toHaveTextContent("<img src=x onerror=alert(1)>");
});
it("formats only the selected words", () => {
  const onChange = vi.fn();
  render(<CommentEditor value="Olá mundo" onChange={onChange} placeholder="Comentário" />);
  const input = screen.getByRole("textbox") as HTMLTextAreaElement;
  input.setSelectionRange(4, 9);
  fireEvent.click(screen.getByRole("button", { name: "Negrito" }));
  expect(onChange).toHaveBeenCalledWith("Olá **mundo**");
});
it("changes the size of the current line while keeping other lines", () => {
  const onChange = vi.fn();
  render(
    <CommentEditor value={"Primeira\n## Segunda"} onChange={onChange} placeholder="Comentário" />,
  );
  (screen.getByRole("textbox") as HTMLTextAreaElement).setSelectionRange(14, 14);
  fireEvent.change(screen.getByRole("combobox", { name: "Tamanho do texto" }), {
    target: { value: "# " },
  });
  expect(onChange).toHaveBeenCalledWith("Primeira\n# Segunda");
});
