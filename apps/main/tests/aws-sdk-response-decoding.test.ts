// @vitest-environment node

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

const localClientConfig = {
  region: "us-east-1",
  credentials: {
    accessKeyId: "local-control",
    secretAccessKey: "local-control",
  },
};

function xmlResponse(body: string, statusCode = 200) {
  return {
    handle: async () => ({
      response: {
        statusCode,
        headers: { "content-type": "application/xml" },
        body: Readable.from([body]),
      },
    }),
  };
}

describe("AWS SDK response decoding", () => {
  it.each([
    {
      name: "ordinary response",
      entity: "",
      value: "message-123",
      expected: "message-123",
    },
    {
      name: "less-than entity",
      entity: '<!ENTITY l. "replacement">',
      value: "&lt;id&gt;",
      expected: "<id>",
    },
    {
      name: "ampersand entity",
      entity: '<!ENTITY am. "replacement">',
      value: "A&amp;B",
      expected: "A&B",
    },
  ])(
    "preserves predefined XML entities in $name",
    async ({ entity, value, expected }) => {
      const doctype = entity ? `<!DOCTYPE SendEmailResponse [${entity}]>` : "";
      const client = new SESClient({
        ...localClientConfig,
        requestHandler: xmlResponse(`<?xml version="1.0"?>${doctype}
        <SendEmailResponse xmlns="http://ses.amazonaws.com/doc/2010-12-01/">
          <SendEmailResult><MessageId>${value}</MessageId></SendEmailResult>
          <ResponseMetadata><RequestId>local</RequestId></ResponseMetadata>
        </SendEmailResponse>`),
      });
      try {
        const result = await client.send(
          new SendEmailCommand({
            Source: "sender@example.invalid",
            Destination: { ToAddresses: ["recipient@example.invalid"] },
            Message: {
              Subject: { Data: "Local control" },
              Body: { Text: { Data: "Local control" } },
            },
          }),
        );
        expect(result.MessageId).toBe(expected);
      } finally {
        client.destroy();
      }
    },
  );

  it("preserves S3 service errors and their encoded message", async () => {
    const client = new S3Client({
      ...localClientConfig,
      requestHandler: xmlResponse(
        "<Error><Code>NoSuchKey</Code><Message>Missing &amp; unavailable</Message><RequestId>local</RequestId></Error>",
        404,
      ),
    });
    try {
      await expect(
        client.send(
          new HeadObjectCommand({
            Bucket: "local",
            Key: "missing",
          }),
        ),
      ).rejects.toMatchObject({
        name: "NoSuchKey",
        message: "Missing & unavailable",
      });
    } finally {
      client.destroy();
    }
  });
});
