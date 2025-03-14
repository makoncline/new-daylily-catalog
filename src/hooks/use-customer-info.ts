"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";

export type CustomerInfo = {
  email: string;
  name: string;
};

const CUSTOMER_INFO_KEY = "customer_info";

export function useCustomerInfo() {
  const [customerInfo, setCustomerInfo] = useLocalStorage<CustomerInfo>(
    CUSTOMER_INFO_KEY,
    { email: "", name: "" },
  );

  const updateCustomerInfo = (data: Partial<CustomerInfo>) => {
    setCustomerInfo((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const clearCustomerInfo = () => {
    setCustomerInfo({ email: "", name: "" });
  };

  return {
    customerInfo,
    updateCustomerInfo,
    clearCustomerInfo,
  };
}
