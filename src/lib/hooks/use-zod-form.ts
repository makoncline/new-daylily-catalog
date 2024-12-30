import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm, type UseFormProps } from "react-hook-form";
import type { z } from "zod";

// Adds a unique ID to the form for accessibility
export function useZodForm<TSchema extends z.ZodType>(
  props: Omit<UseFormProps<z.infer<TSchema>>, "resolver"> & {
    schema: TSchema;
  },
) {
  const form = useForm<z.infer<TSchema>>({
    ...props,
    resolver: zodResolver(props.schema, undefined, {
      raw: true, // Prevents double transform
    }),
  });

  return {
    ...form,
    id: useId(),
  };
}
