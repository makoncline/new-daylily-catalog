import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

export default class EvidenceReporter implements Reporter {
  private tests: object[] = [];

  constructor(private options: { directory: string }) {}

  onTestEnd(test: TestCase, result: TestResult) {
    const selected =
      test.location.file ===
      path.resolve("tests/integration/editor-save.integration.ts");
    const media: { file: string; sha256: string }[] = [];
    const context = result.attachments.find(
      ({ name }) => name === "evidence-context",
    )?.body;
    if (selected) {
      for (const attachment of result.attachments) {
        const extension =
          attachment.name === "video" && attachment.contentType === "video/webm"
            ? "webm"
            : /^evidence-(lists|listings)-(before-save|reopened|reloaded)$/.test(
                  attachment.name,
                ) && attachment.contentType === "image/png"
              ? "png"
              : null;
        if (!extension) continue;
        let bytes = attachment.body;
        if (attachment.path) {
          const source = fs.realpathSync(attachment.path);
          if (
            !source.startsWith(
              `${fs.realpathSync(path.join(this.options.directory, "private/results"))}${path.sep}`,
            )
          )
            continue;
          bytes = fs.readFileSync(source);
        }
        if (!bytes) continue;
        const filename = `${this.tests.length + 1}-${attachment.name}.${extension}`;
        fs.writeFileSync(
          path.join(this.options.directory, "public", filename),
          bytes,
        );
        media.push({
          file: filename,
          sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }
    this.tests.push({
      file: path.relative(process.cwd(), test.location.file),
      title: test.title,
      status: result.status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      context: context ? JSON.parse(context.toString()) : null,
      media,
    });
  }

  onEnd(result: FullResult) {
    fs.writeFileSync(
      path.join(this.options.directory, "private/results.json"),
      JSON.stringify({ status: result.status, tests: this.tests }, null, 2),
    );
  }
}
