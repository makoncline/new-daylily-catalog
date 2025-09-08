import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm, type UseFormProps } from "react-hook-form";
import type { z } from "zod";

export function useZodForm<TSchema extends z.ZodType<Record<string, unknown>>>(
  props: Omit<UseFormProps<z.output<TSchema>>, "resolver"> & {
    schema: TSchema;
  },
) {
  const form = useForm<z.output<TSchema>, object, z.output<TSchema>>({
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
