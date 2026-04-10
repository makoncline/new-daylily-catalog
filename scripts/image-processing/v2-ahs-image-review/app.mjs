const countsEl = document.getElementById("counts");
const itemsGridEl = document.getElementById("items-grid");
const pathsEl = document.getElementById("paths");
const syncButtonEl = document.getElementById("sync-button");
const refreshButtonEl = document.getElementById("refresh-button");
const prevButtonEl = document.getElementById("prev-button");
const nextButtonEl = document.getElementById("next-button");
const pageLabelEl = document.getElementById("page-label");
const pageSizeEl = document.getElementById("page-size");

let offset = 0;
let limit = Number(pageSizeEl?.value ?? "4");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCounts(counts) {
  const entries = [
    ["Total", counts.total],
    ["Pending", counts.pending],
    ["Processing", counts.processing],
    ["Review", counts.review],
    ["Approved", counts.approved],
    ["Failed", counts.failed],
  ];

  if (!countsEl) {
    return;
  }

  countsEl.innerHTML = entries
    .map(
      ([label, value]) =>
        `<div class="status-cell"><div class="count-label">${escapeHtml(label)}</div><div class="count-value">${escapeHtml(value)}</div></div>`,
    )
    .join("");
}

function renderQueueItem(item) {
  const title = item.postTitle ?? item.id;
  const errorHtml = item.lastError
    ? `<div class="error">Last error: ${escapeHtml(item.lastError)}</div>`
    : "";
  const editedHtml = item.editedPath
    ? `<div class="image-stage"><img alt="Edited ${escapeHtml(title)}" src="/image?id=${encodeURIComponent(item.id)}&variant=edited" /></div>`
    : '<div class="empty">No edited image yet for this item.</div>';

  return `
    <section class="queue-item">
      <div class="queue-header">
        <div class="meta">
          <div class="eyebrow">Queue Item</div>
          <div class="queue-title">${escapeHtml(title)}</div>
          <div class="queue-meta">
            <span>id <code>${escapeHtml(item.id)}</code></span>
            <span>status <code>${escapeHtml(item.status)}</code></span>
            <span>attempts <code>${escapeHtml(item.attempts)}</code></span>
          </div>
          ${errorHtml}
        </div>
        <div class="actions">
          <button class="approve" data-id="${escapeHtml(item.id)}" data-status="approved" type="button">Approve</button>
          <button class="reject" data-id="${escapeHtml(item.id)}" data-status="rejected" type="button">Reject</button>
          <button class="neutral" data-id="${escapeHtml(item.id)}" data-status="requeue" type="button">Requeue</button>
        </div>
      </div>
      <div class="compare-wrap">
        <div class="compare-strip">
          <div class="compare-pane">
            <div class="pane-label">Original</div>
            <div class="image-stage">
              <img alt="Original ${escapeHtml(title)}" src="/image?id=${encodeURIComponent(item.id)}&variant=original" />
            </div>
          </div>
          <div class="compare-pane">
            <div class="pane-label">Edited</div>
            ${editedHtml}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderItems(items, paging, total) {
  if (!itemsGridEl) {
    return;
  }

  if (!items.length) {
    itemsGridEl.innerHTML =
      '<div class="empty">Queue is empty. Run the sync command, then start the worker.</div>';

    if (pageLabelEl) {
      pageLabelEl.textContent = "No items";
    }

    return;
  }

  itemsGridEl.innerHTML = items.map((item) => renderQueueItem(item)).join("");

  const start = paging.offset + 1;
  const end = paging.offset + items.length;

  if (pageLabelEl) {
    pageLabelEl.textContent = `${start}-${end} of ${total}`;
  }

  for (const button of itemsGridEl.querySelectorAll("[data-status][data-id]")) {
    button.addEventListener("click", async () => {
      await fetch("/api/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: button.getAttribute("data-id"),
          status: button.getAttribute("data-status"),
        }),
      });
      await loadState();
    });
  }
}

async function loadState() {
  const response = await fetch(
    `/api/state?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`,
    { cache: "no-store" },
  );
  const state = await response.json();
  renderCounts(state.counts);

  if (pathsEl) {
    pathsEl.innerHTML = `Originals: <code>${escapeHtml(state.paths.originals)}</code><br />Edited: <code>${escapeHtml(state.paths.edited)}</code><br />Queue DB: <code>${escapeHtml(state.paths.db)}</code>`;
  }

  renderItems(state.items ?? [], state.paging ?? { limit, offset }, state.counts.total);

  if (prevButtonEl instanceof HTMLButtonElement) {
    prevButtonEl.disabled = offset <= 0;
  }

  if (nextButtonEl instanceof HTMLButtonElement) {
    nextButtonEl.disabled = offset + limit >= state.counts.total;
  }
}

syncButtonEl?.addEventListener("click", async () => {
  if (syncButtonEl instanceof HTMLButtonElement) {
    syncButtonEl.disabled = true;
  }

  try {
    await fetch("/api/sync", { method: "POST" });
    await loadState();
  } finally {
    if (syncButtonEl instanceof HTMLButtonElement) {
      syncButtonEl.disabled = false;
    }
  }
});

refreshButtonEl?.addEventListener("click", async () => {
  await loadState();
});

prevButtonEl?.addEventListener("click", async () => {
  offset = Math.max(0, offset - limit);
  await loadState();
});

nextButtonEl?.addEventListener("click", async () => {
  offset += limit;
  await loadState();
});

pageSizeEl?.addEventListener("change", async () => {
  limit = Number(pageSizeEl.value || "4");
  offset = 0;
  await loadState();
});

void loadState();
