export function UnsupportedSafariNotice() {
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
      <script
        id="unsupported-safari-notice-script"
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              var userAgent = navigator.userAgent || "";
              var versionMatch = /Version\\/(\\d+)\\.(\\d+)/.exec(userAgent);
              var isSafari =
                /Safari\\//.test(userAgent) &&
                !/(Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPiOS)/.test(userAgent);

              if (!isSafari || !versionMatch) {
                return;
              }

              var major = parseInt(versionMatch[1], 10);
              var minor = parseInt(versionMatch[2], 10);
              var isUnsupportedSafari = major < 16 || (major === 16 && minor < 4);

              if (!isUnsupportedSafari) {
                return;
              }

              function checkTailwindStyles() {
                var sentinel = document.getElementById("tailwind-compatibility-sentinel");
                var notice = document.getElementById("unsupported-safari-notice");

                if (!sentinel || !notice || !window.getComputedStyle) {
                  return;
                }

                if (window.getComputedStyle(sentinel).display !== "none") {
                  notice.style.display = "block";
                }
              }

              if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", checkTailwindStyles);
              } else {
                checkTailwindStyles();
              }
            })();
          `,
        }}
      />
      <div
        id="tailwind-compatibility-sentinel"
        className="hidden"
        aria-hidden="true"
      />
      <div id="unsupported-safari-notice" role="alert">
        <strong>Your Safari browser is too old for Daylily Catalog.</strong>
        This site requires Safari 16.4 or newer. Please update Safari, update
        iOS/macOS, or use a current version of Chrome, Edge, or Firefox.
      </div>
    </>
  );
}
