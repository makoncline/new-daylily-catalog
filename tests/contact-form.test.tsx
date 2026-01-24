import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ContactForm } from "@/components/contact-form";

// Mock hooks
let cartItems: Array<{ id: string }> = [];

const mockUseCart = vi.fn(() => ({
  items: cartItems,
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
  total: 0,
}));

const mockUseCustomerInfo = vi.fn(() => ({
  customerInfo: { email: "", name: "" },
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
        useMutation: () => ({
          mutate: mockSendMessage,
          isPending: false,
        }),
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
  reportError: vi.fn(),
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
      cartItems = [{ id: "item-1" }];
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

      expect(
        await screen.findByText(/include a message/i),
      ).toBeInTheDocument();

      await flushMicrotasks();
    } finally {
      t.stop();
    }

    expect(t.reasons).toHaveLength(0);
  });
});
