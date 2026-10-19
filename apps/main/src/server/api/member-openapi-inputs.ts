import { z } from "zod";
import {
  MEMBER_CREATE_ID_FIELDS,
  MEMBER_MANAGE_OPERATIONS,
  MEMBER_READ_OPERATIONS,
  MEMBER_WRITE_OPERATIONS,
} from "@/lib/member-api-contract";
import { memberRouter } from "@/server/api/routers/member";

export function getMemberOpenApiInputSchemas() {
  const schemas: Record<string, Record<string, unknown> | null> = {};
  const procedures = memberRouter._def.procedures as unknown as Record<
    string,
    { _def: { inputs: unknown[] } }
  >;

  for (const [name] of [
    ...MEMBER_READ_OPERATIONS,
    ...MEMBER_WRITE_OPERATIONS,
    ...MEMBER_MANAGE_OPERATIONS,
  ]) {
    const procedure = procedures[name];
    if (!procedure) {
      throw new Error(`Missing member procedure: ${name}`);
    }
    const inputs = procedure._def.inputs;
    if (inputs.length === 0) {
      schemas[name] = null;
      continue;
    }
    if (inputs.length !== 1 || !(inputs[0] instanceof z.ZodType)) {
      throw new Error(`Cannot document member procedure input: ${name}`);
    }
    const schema = z.toJSONSchema(inputs[0], {
      io: "input",
      target: "draft-2020-12",
    }) as Record<string, unknown>;
    const createIdField =
      MEMBER_CREATE_ID_FIELDS[name as keyof typeof MEMBER_CREATE_ID_FIELDS];
    if (createIdField) {
      const properties = schema.properties as
        | Record<string, unknown>
        | undefined;
      if (!properties?.[createIdField]) {
        throw new Error(`Missing ${createIdField} input: ${name}`);
      }
      schema.required = [
        ...((schema.required as string[] | undefined) ?? []),
        createIdField,
      ];
    }
    schemas[name] = schema;
  }

  return schemas;
}
