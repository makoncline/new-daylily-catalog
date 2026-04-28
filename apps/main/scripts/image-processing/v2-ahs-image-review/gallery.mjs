const gridEl = document.getElementById("grid");
const metaEl = document.getElementById("meta");
const refreshButtonEl = document.getElementById("refresh-button");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render(items) {
  if (metaEl) {
    metaEl.textContent = `${items.length} edited images`;
  }

  if (!gridEl) {
    return;
  }

  if (!items.length) {
    gridEl.innerHTML = '<div class="empty">No edited images yet.</div>';
    return;
  }

  gridEl.innerHTML = items
    .map((item) => {
      const title = item.postTitle ?? item.id;
      return `
        <a class="tile" href="/image?id=${encodeURIComponent(item.id)}&variant=edited" target="_blank" rel="noreferrer">
          <div class="thumb">
            <img
              alt="${escapeHtml(title)}"
              loading="lazy"
              src="/image?id=${encodeURIComponent(item.id)}&variant=edited"
            />
          </div>
          <div class="caption" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
          <div class="status">${escapeHtml(item.status)}</div>
        </a>
      `;
    })
    .join("");
}

async function loadGallery() {
  const response = await fetch("/api/edited", { cache: "no-store" });
  const payload = await response.json();
  render(payload.items ?? []);
}

refreshButtonEl?.addEventListener("click", async () => {
  await loadGallery();
});

void loadGallery();
