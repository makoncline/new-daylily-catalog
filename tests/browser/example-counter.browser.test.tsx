import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

function ExampleCounter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        Increment
      </button>
    </div>
  );
}

test("browser mode canary renders and updates", () => {
  render(<ExampleCounter />);

  expect(screen.getByText("Count: 0")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Increment" }));
  expect(screen.getByText("Count: 1")).toBeInTheDocument();
});
