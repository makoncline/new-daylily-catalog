import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

function ExampleCounter() {
  const [value, setValue] = useState(0);

  return (
    <div>
      <p>Count: {value}</p>

      <button type="button" onClick={() => setValue((current) => current + 1)}>
        Increment
      </button>
    </div>
  );
}

describe("ExampleCounter (browser mode)", () => {
  it("updates rendered state after user interaction", () => {
    render(<ExampleCounter />);

    expect(screen.getByText("Count: 0")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Increment" }));
    fireEvent.click(screen.getByRole("button", { name: "Increment" }));

    expect(screen.getByText("Count: 2")).toBeInTheDocument();
  });
});
