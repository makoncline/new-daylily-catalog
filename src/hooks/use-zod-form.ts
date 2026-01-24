import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm, type FieldValues, type UseFormProps } from "react-hook-form";
import type { z } from "zod";

export function useZodForm<TSchema extends z.ZodType<unknown, FieldValues>>(
  props: Omit<UseFormProps<z.input<TSchema>>, "resolver"> & {
    schema: TSchema;
  },
) {
  const form = useForm<z.input<TSchema>, object, z.input<TSchema>>({
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
