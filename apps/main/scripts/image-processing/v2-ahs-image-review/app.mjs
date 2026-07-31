const countsEl = document.getElementById("counts");
const itemsGridEl = document.getElementById("items-grid");
const syncButtonEl = document.getElementById("sync-button");
const refreshButtonEl = document.getElementById("refresh-button");
const approveAllButtonEl = document.getElementById("approve-all-button");
const approveAllDialogEl = document.getElementById("approve-all-dialog");
const approveAllCountEl = document.getElementById("approve-all-count");
const approveAllCancelEl = document.getElementById("approve-all-cancel");
const approveAllConfirmEl = document.getElementById("approve-all-confirm");
const detailDialogEl = document.getElementById("detail-dialog");
const detailTitleEl = document.getElementById("detail-title");
const detailIdEl = document.getElementById("detail-id");
const detailOriginalEl = document.getElementById("detail-original");
const detailEditedEl = document.getElementById("detail-edited");
const detailCloseEl = document.getElementById("detail-close");
const detailRejectEl = document.getElementById("detail-reject");
const pageLabelEl = document.getElementById("page-label");
const actionMessageEl = document.getElementById("action-message");

let approvingAll = false;
let approvingPage = false;
let totalReviewCount = 0;
let allReviewItems = [];
let currentPage = 0;
let pageSize = 1;
let activeItemId = null;
let reviewItemsById = new Map();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderCounts(counts) {
  const entries = [
    ["Review", counts.review],
    ["Processing", counts.processing],
    ["Failed", counts.failed],
    ["Approved", counts.approved],
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

  totalReviewCount = Number(counts.review ?? 0);
  updateApproveAllButton();
}

function updateApproveAllButton() {
  if (approveAllButtonEl instanceof HTMLButtonElement) {
    approveAllButtonEl.disabled = approvingAll || totalReviewCount === 0;
  }
}

function setActionMessage(message, kind = "") {
  if (!actionMessageEl) {
    return;
  }

  actionMessageEl.textContent = message;
  actionMessageEl.classList.toggle("ok", kind === "ok");
  actionMessageEl.classList.toggle("error", kind === "error");
}

function removeQueueItem(id) {
  reviewItemsById.delete(id);
  allReviewItems = allReviewItems.filter((item) => item.id !== id);
  renderPage();
}

function renderQueueItem(item) {
  const title = item.postTitle ?? item.id;
  const imageVersion = encodeURIComponent(item.updatedAt ?? "");
  const originalSrc = `/image?id=${encodeURIComponent(item.id)}&variant=original&v=${imageVersion}`;
  const editedSrc = `/image?id=${encodeURIComponent(item.id)}&variant=edited&v=${imageVersion}`;

  return `
    <button class="queue-item" data-open-id="${escapeHtml(item.id)}" type="button" aria-label="Inspect ${escapeHtml(title)}">
      <div class="compare-strip">
        <img alt="Original ${escapeHtml(title)}" src="${originalSrc}" loading="lazy" decoding="async" />
        <img alt="Edited ${escapeHtml(title)}" src="${editedSrc}" loading="lazy" decoding="async" />
      </div>
    </button>
  `;
}

function getPageSize() {
  const barHeight =
    document.querySelector(".utility-bar")?.getBoundingClientRect().height ??
    41;
  const columns = Math.max(1, Math.floor(window.innerWidth / 281));
  const rows = Math.max(1, Math.floor((window.innerHeight - barHeight) / 161));

  return columns * rows;
}

function getPageCount() {
  return Math.max(1, Math.ceil(allReviewItems.length / pageSize));
}

function getCurrentPageItems() {
  const start = currentPage * pageSize;
  return allReviewItems.slice(start, start + pageSize);
}

function renderPage() {
  if (!itemsGridEl) {
    return;
  }

  pageSize = getPageSize();
  currentPage = Math.min(currentPage, getPageCount() - 1);
  const pageItems = getCurrentPageItems();

  if (!pageItems.length) {
    itemsGridEl.innerHTML =
      '<div class="empty">Queue is empty. Run the sync command, then start the worker.</div>';
    if (pageLabelEl) {
      pageLabelEl.textContent = "";
    }
    return;
  }

  itemsGridEl.innerHTML = pageItems
    .map((item) => renderQueueItem(item))
    .join("");

  if (pageLabelEl) {
    pageLabelEl.textContent = `${currentPage + 1}/${getPageCount()} · ${pageItems.length} items · A approve page`;
  }
}

function renderItems(items) {
  allReviewItems = items;
  reviewItemsById = new Map(items.map((item) => [item.id, item]));
  renderPage();
}

function navigatePage(offset) {
  const pageCount = getPageCount();
  currentPage = (currentPage + offset + pageCount) % pageCount;
  renderPage();
}

function openDetail(id) {
  const item = reviewItemsById.get(id);

  if (
    !item ||
    !(detailDialogEl instanceof HTMLDialogElement) ||
    !(detailOriginalEl instanceof HTMLImageElement) ||
    !(detailEditedEl instanceof HTMLImageElement)
  ) {
    return;
  }

  const title = item.postTitle ?? item.id;
  const imageVersion = encodeURIComponent(item.updatedAt ?? "");
  activeItemId = item.id;
  detailTitleEl.textContent = title;
  detailIdEl.textContent = item.id;
  detailOriginalEl.src = `/image?id=${encodeURIComponent(item.id)}&variant=original&v=${imageVersion}`;
  detailEditedEl.src = `/image?id=${encodeURIComponent(item.id)}&variant=edited&v=${imageVersion}`;
  if (detailRejectEl instanceof HTMLButtonElement) {
    detailRejectEl.disabled = false;
  }
  if (!detailDialogEl.open) {
    detailDialogEl.showModal();
  }
}

async function updateItemStatus(id, status, button) {
  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
  }
  setActionMessage(`${status} ${id}...`);

  try {
    const response = await fetch("/api/status", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ id, status }),
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    setActionMessage(`${id} -> ${status}`, "ok");

    if (payload.counts) {
      renderCounts(payload.counts);
    }

    removeQueueItem(id);
    if (detailDialogEl instanceof HTMLDialogElement) {
      detailDialogEl.close();
    }
    activeItemId = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setActionMessage(`${id}: ${message}`, "error");
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
    }
  }
}

itemsGridEl?.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) {
    return;
  }

  const button = target.closest("[data-open-id]");

  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  const id = button.getAttribute("data-open-id");
  if (id) {
    openDetail(id);
  }
});

async function loadState() {
  const response = await fetch("/api/state", { cache: "no-store" });
  const state = await response.json();
  renderCounts(state.counts);

  renderItems(state.items ?? []);
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

async function approveCurrentPage() {
  if (approvingPage) {
    return;
  }

  const ids = getCurrentPageItems().map((item) => item.id);
  if (ids.length === 0) {
    return;
  }

  approvingPage = true;
  setActionMessage(`Approving page ${currentPage + 1}...`);

  try {
    const response = await fetch("/api/approve-page", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ ids }),
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    await loadState();
    setActionMessage(`Approved ${payload.updated} images`, "ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setActionMessage(`Approve page failed: ${message}`, "error");
  } finally {
    approvingPage = false;
  }
}

approveAllButtonEl?.addEventListener("click", () => {
  if (
    !(approveAllDialogEl instanceof HTMLDialogElement) ||
    totalReviewCount === 0
  ) {
    return;
  }

  if (approveAllCountEl) {
    approveAllCountEl.textContent = String(totalReviewCount);
  }
  approveAllDialogEl.showModal();
});

approveAllCancelEl?.addEventListener("click", () => {
  if (approveAllDialogEl instanceof HTMLDialogElement) {
    approveAllDialogEl.close();
  }
});

approveAllConfirmEl?.addEventListener("click", async () => {
  if (!(approveAllDialogEl instanceof HTMLDialogElement)) {
    return;
  }

  approveAllDialogEl.close();
  approvingAll = true;
  if (approveAllButtonEl instanceof HTMLButtonElement) {
    approveAllButtonEl.disabled = true;
  }
  setActionMessage(`Approving all ${totalReviewCount} images...`);

  try {
    const response = await fetch("/api/approve-all", {
      method: "POST",
      headers: { accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload.ok !== true) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    await loadState();
    setActionMessage(`Approved ${payload.updated} images`, "ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setActionMessage(`Approve all failed: ${message}`, "error");
  } finally {
    approvingAll = false;
    updateApproveAllButton();
  }
});

detailCloseEl?.addEventListener("click", () => {
  if (detailDialogEl instanceof HTMLDialogElement) {
    detailDialogEl.close();
  }
  activeItemId = null;
});

detailDialogEl?.addEventListener("close", () => {
  activeItemId = null;
});

detailRejectEl?.addEventListener("click", () => {
  if (activeItemId) {
    void updateItemStatus(activeItemId, "rejected", detailRejectEl);
  }
});

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
    return;
  }

  if (
    approveAllDialogEl instanceof HTMLDialogElement &&
    approveAllDialogEl.open
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      approveAllConfirmEl?.click();
    }
    return;
  }

  if (detailDialogEl instanceof HTMLDialogElement && detailDialogEl.open) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigatePage(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    navigatePage(1);
  } else if (!event.shiftKey && event.key.toLowerCase() === "a") {
    event.preventDefault();
    void approveCurrentPage();
  }
});

window.addEventListener("resize", () => {
  renderPage();
});

window.setInterval(() => {
  void loadState();
}, 10_000);

void loadState();
