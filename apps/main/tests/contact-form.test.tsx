import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ContactForm } from "@/components/contact-form";
import type { CartItem } from "@/types";

// Mock hooks
const cartItem: CartItem = {
  id: "item-1",
  listingId: "item-1",
  price: 40,
  quantity: 1,
  title: "Example Daylily",
  userId: "test-user-id",
};
let cartItems: CartItem[] = [];
type MutationOnError = (error: unknown, errorInfo: unknown) => void;
const mutationOnError = vi.hoisted(() => ({
  current: undefined as MutationOnError | undefined,
}));
const reportErrorMock = vi.hoisted(() => vi.fn());
const mockAddItem = vi.fn();
const mockUpdateQuantity = vi.fn();
const mockRemoveItem = vi.fn();

const mockUseCart = vi.fn(() => ({
  items: cartItems,
  addItem: mockAddItem,
  updateQuantity: mockUpdateQuantity,
  removeItem: mockRemoveItem,
  clearCart: vi.fn(),
  total: 0,
}));

let customerInfo = { email: "", name: "" };
const mockUseCustomerInfo = vi.fn(() => ({
  customerInfo,
  updateCustomerInfo: vi.fn(),
}));

const mockSendMessage = vi.fn();

vi.mock("@/hooks/use-cart", () => ({
  useCart: () => mockUseCart(),
}));

vi.mock("@/hooks/use-customer-info", () => ({
  useCustomerInfo: () => mockUseCustomerInfo(),
}));

vi.mock("@/trpc/react", () => ({
  api: {
    public: {
      sendMessage: {
        useMutation: (
          opts: {
            onError?: (error: unknown, errorInfo: unknown) => void;
          } = {},
        ) => {
          mutationOnError.current = opts.onError;
          return {
            mutate: mockSendMessage,
            isPending: false,
          };
        },
      },
    },
  },
  TRPCReactProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock error reporting
vi.mock("@/lib/error-utils", () => ({
  getErrorMessage: vi.fn((e) => e.message),
  normalizeError: vi.fn((e) => e),
  reportError: reportErrorMock,
}));

describe("ContactForm", () => {
  const trackUnhandledRejections = () => {
    const reasons: unknown[] = [];

    const onWindow = (e: PromiseRejectionEvent) => {
      reasons.push(e.reason);
      e.preventDefault();
    };

    const onNode = (reason: unknown) => {
      reasons.push(reason);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", onWindow);
    }

    if (typeof process !== "undefined") {
      process.on("unhandledRejection", onNode);
    }

    return {
      reasons,
      stop() {
        if (typeof window !== "undefined") {
          window.removeEventListener("unhandledrejection", onWindow);
        }
        if (typeof process !== "undefined") {
          process.off("unhandledRejection", onNode);
        }
      },
    };
  };

  const flushMicrotasks = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cartItems = [];
    customerInfo = { email: "", name: "" };
  });

  it("invalid email shows field error and does not trigger unhandled rejection", async () => {
    const t = trackUnhandledRejections();
    try {
      const { container } = render(<ContactForm userId="test-user-id" />);

      // Find the email input
      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;

      // Enter invalid email and submit (should trigger validation)
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      const formElement = container.querySelector("form");
      if (!formElement) {
        throw new Error("Form element not found");
      }
      fireEvent.submit(formElement);

      expect(
        await screen.findByText(/valid email address/i),
      ).toBeInTheDocument();

      await flushMicrotasks();
    } finally {
      t.stop();
    }

    expect(t.reasons).toHaveLength(0);
  });

  it("cart change revalidates message without unhandled rejection", async () => {
    const t = trackUnhandledRejections();
    try {
      cartItems = [cartItem];
      const { rerender, container } = render(
        <ContactForm userId="test-user-id" />,
      );

      cartItems = [];
      rerender(<ContactForm userId="test-user-id" />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      const formElement = container.querySelector("form");
      if (!formElement) {
        throw new Error("Form element not found");
      }
      fireEvent.submit(formElement);

      expect(await screen.findByText(/include a message/i)).toBeInTheDocument();

      await flushMicrotasks();
    } finally {
      t.stop();
    }

    expect(t.reasons).toHaveLength(0);
  });

  it("enables submission for a cart when valid remembered customer info is restored", async () => {
    cartItems = [cartItem];
    customerInfo = { email: "remembered@example.com", name: "Buyer" };

    render(<ContactForm userId="test-user-id" />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Send Message" }),
      ).toBeEnabled(),
    );
  });

  it("keeps named cart controls clickable while the email field is focused", async () => {
    cartItems = [cartItem];

    render(<ContactForm userId="test-user-id" />);
    await act(async () => {
      screen.getByRole("textbox", { name: "Email" }).focus();
    });

    const increase = screen.getByRole("button", {
      name: "Increase quantity for Example Daylily",
    });
    await act(async () => {
      expect(fireEvent.pointerDown(increase)).toBe(false);
      fireEvent.click(increase);
    });

    expect(mockUpdateQuantity).toHaveBeenCalledWith("item-1", 2);
    expect(
      screen.getByRole("button", {
        name: "Decrease quantity for Example Daylily",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove Example Daylily from cart" }),
    ).toBeInTheDocument();
  });

  it("names the listing cart action and adds the selected listing", () => {
    const listing = {
      id: "item-1",
      price: 40,
      title: "Example Daylily",
      userId: "test-user-id",
    };

    render(<AddToCartButton listing={listing} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Add Example Daylily to cart" }),
    );

    expect(mockAddItem).toHaveBeenCalledWith({
      ...listing,
      listingId: listing.id,
      quantity: 1,
    });
  });

  it("does not report expected BAD_REQUEST validation errors", async () => {
    render(<ContactForm userId="test-user-id" />);

    await act(async () => {
      mutationOnError.current?.(
        {
          message: "Name is required",
          data: { code: "BAD_REQUEST" },
        },
        {},
      );
    });

    expect(reportErrorMock).not.toHaveBeenCalled();
  });
});
