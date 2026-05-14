"use client";

import { useEffect } from "react";

// eslint-disable react/no-danger -- intentional static style injection for the compatibility notice.
export function UnsupportedSafariNotice() {
  useEffect(() => {
    const userAgent = navigator.userAgent || "";
    const versionMatch = /Version\/(\d+)\.(\d+)/.exec(userAgent);
    const isSafari =
      userAgent.includes("Safari/") &&
      !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS)/.test(userAgent);

    if (!isSafari || !versionMatch) {
      return;
    }

    const major = Number.parseInt(versionMatch[1] ?? "0", 10);
    const minor = Number.parseInt(versionMatch[2] ?? "0", 10);
    const isUnsupportedSafari = major < 16 || (major === 16 && minor < 4);

    if (!isUnsupportedSafari) {
      return;
    }

    const sentinel = document.getElementById("tailwind-compatibility-sentinel");
    const notice = document.getElementById("unsupported-safari-notice");

    if (!sentinel || !notice || !window.getComputedStyle) {
      return;
    }

    if (window.getComputedStyle(sentinel).display !== "none") {
      notice.style.display = "block";
    }
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #unsupported-safari-notice {
              display: none;
              background: #fff7ed;
              border-bottom: 1px solid #fed7aa;
              color: #431407;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 16px;
              line-height: 1.5;
              padding: 16px 20px;
              position: relative;
              z-index: 2147483647;
            }

            #unsupported-safari-notice strong {
              display: block;
              font-size: 18px;
              margin-bottom: 4px;
            }
          `,
        }}
      />
      <div
        id="tailwind-compatibility-sentinel"
        className="hidden"
        aria-hidden="true"
      />
      <div id="unsupported-safari-notice" role="alert">
        <strong>Your Safari version is too old for Daylily Catalog.</strong>{" "}
        Please update Safari to version 16.4 or newer, update iOS/macOS, or use
        the latest version of Chrome, Edge, or Firefox.
      </div>
    </>
  );
}
