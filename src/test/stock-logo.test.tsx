import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { StockLogo } from "@/components/StockLogo";

it("shows a ticker fallback if the company logo cannot be loaded", () => {
  render(<StockLogo symbol="ITUB4" />);
  fireEvent.error(screen.getByAltText("Logo de ITUB4"));
  expect(screen.getByLabelText("Logo de ITUB4 indisponível")).toHaveTextContent("IT");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});
