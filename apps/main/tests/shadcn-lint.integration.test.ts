import path from "node:path";
import { ESLint } from "eslint";
import { expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });
const pagePath = path.join(
  process.cwd(),
  "src/app/(public)/_components/home-page-client.tsx",
);
const definitionPath = path.join(process.cwd(), "src/components/ui/button.tsx");

async function lintText(source: string, filePath: string) {
  const [result] = await eslint.lintText(source, { filePath });
  if (!result) throw new Error(`ESLint did not scan ${filePath}`);
  return result;
}

// The first lint call loads the project's TypeScript and Tailwind config.
it("reports all six design rules as nonblocking warnings in UI callers", async () => {
  const result = await lintText(
    `import { Button } from "@/components/ui/button";
export function Example({ color }: { color: string }) {
  return <>
    <Button className="p-4 bg-pink-500 p-[13px] rounded-huge" style={{ color: "red" }}>Save</Button>
    <Button className={\`bg-\${color}\`}>Dynamic</Button>
  </>;
}`,
    pagePath,
  );

  const findings = result.messages.filter((message) =>
    message.ruleId?.startsWith("shadcn/"),
  );
  expect(new Set(findings.map((message) => message.ruleId))).toEqual(
    new Set([
      "shadcn/no-restyle",
      "shadcn/no-raw-colors",
      "shadcn/no-arbitrary-values",
      "shadcn/no-inline-styles",
      "shadcn/require-static-classes",
      "shadcn/no-unknown-classes",
    ]),
  );
  expect(findings.every((message) => message.severity === 1)).toBe(true);
  expect(result.errorCount).toBe(0);
}, 60_000);

it("accepts a component variant and layout classes", async () => {
  const result = await lintText(
    `import { Button } from "@/components/ui/button";
export function Example() {
  return <Button variant="outline" className="mt-4 w-full">Save</Button>;
}`,
    pagePath,
  );

  expect(
    result.messages.filter((message) => message.ruleId?.startsWith("shadcn/")),
  ).toEqual([]);
});

it("checks primitive definitions without applying caller rules", async () => {
  expect(await eslint.isPathIgnored(definitionPath)).toBe(false);
  const result = await lintText(
    `export function Button() {
  return <button className="bg-pink-500 rounded-huge" style={{ color: "red" }}>Save</button>;
}`,
    definitionPath,
  );

  const rules = new Set(
    result.messages
      .filter((message) => message.ruleId?.startsWith("shadcn/"))
      .map((message) => message.ruleId),
  );
  expect(rules).toEqual(
    new Set([
      "shadcn/no-raw-colors",
      "shadcn/no-inline-styles",
      "shadcn/no-unknown-classes",
    ]),
  );
  expect(result.errorCount).toBe(0);
});
