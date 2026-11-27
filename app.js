// Campus Lost & Found Portal — Frontend JavaScript

let allItems = [];
let activeFilter = "all";
let activeCategory = "all";
let sortOrder = "newest";
let hideReturned = false;
let searchQuery = "";
let uploadedImageDataUrl = "";
let activeModalItemId = null;

// Fallback colorful category artwork if a student posts without uploading a photo
const CATEGORY_FALLBACKS = {
  Electronics: "/images/cat-electronics.svg",
  "ID Cards & Wallets": "/images/cat-id.svg",
  "Books & Notes": "/images/cat-books.svg",
  Keys: "/images/cat-keys.svg",
  Accessories: "/images/cat-accessories.svg",
  Clothing: "/images/cat-clothing.svg",
  Other: "/images/cat-other.svg",
};

// Page elements
const findItemBtn = document.getElementById("find-item-btn");
const reportItemBtn = document.getElementById("report-item-btn");

const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const categoryFilter = document.getElementById("category-filter");
const sortSelect = document.getElementById("sort-select");
const filterButtons = document.querySelectorAll(".filter-btn");
const hideReturnedToggle = document.getElementById("hide-returned-toggle");
const locationChips = document.querySelectorAll(".location-chip");
const resetFiltersBtn = document.getElementById("reset-filters-btn");

const itemsCount = document.getElementById("items-count");
const itemsGrid = document.getElementById("items-grid");
const emptyState = document.getElementById("empty-state");
const emptyStateMessage = document.getElementById("empty-state-message");
const browseFeedback = document.getElementById("browse-feedback");
const browseFeedbackText = document.getElementById("browse-feedback-text");
const retryFetchBtn = document.getElementById("retry-fetch-btn");

const reportForm = document.getElementById("report-form");
const formFeedback = document.getElementById("form-feedback");
const submitBtn = document.getElementById("submit-btn");

const itemNameInput = document.getElementById("item-name");
const itemCategoryInput = document.getElementById("item-category");
const itemLocationInput = document.getElementById("item-location");
const itemContactInput = document.getElementById("item-contact");
const itemImageInput = document.getElementById("item-image");
const imagePreviewBox = document.getElementById("image-preview-box");
const imagePreview = document.getElementById("image-preview");
const removeImageBtn = document.getElementById("remove-image-btn");
const itemDescriptionInput = document.getElementById("item-description");
const charCount = document.getElementById("char-count");

// Modal elements
const itemModal = document.getElementById("item-modal");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalImage = document.getElementById("modal-image");
const modalStatusBadge = document.getElementById("modal-status-badge");
const modalReturnedBadge = document.getElementById("modal-returned-badge");
const modalViewPane = document.getElementById("modal-view-pane");
const modalCategoryBadge = document.getElementById("modal-category-badge");
const modalDate = document.getElementById("modal-date");
const modalTitle = document.getElementById("modal-title");
const modalDescription = document.getElementById("modal-description");
const modalLocation = document.getElementById("modal-location");
const modalContact = document.getElementById("modal-contact");
const modalDeleteConfirm = document.getElementById("modal-delete-confirm");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const modalActions = document.getElementById("modal-actions");

// Modal Edit Form elements
const modalEditForm = document.getElementById("modal-edit-form");
const modalEditError = document.getElementById("modal-edit-error");
const editTypeInput = document.getElementById("edit-type");
const editNameInput = document.getElementById("edit-name");
const editCategoryInput = document.getElementById("edit-category");
const editLocationInput = document.getElementById("edit-location");
const editContactInput = document.getElementById("edit-contact");
const editDescriptionInput = document.getElementById("edit-description");
const saveEditBtn = document.getElementById("save-edit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");

const fieldMap = {
  name: { input: itemNameInput, errorEl: document.getElementById("error-name") },
  category: { input: itemCategoryInput, errorEl: document.getElementById("error-category") },
  location: { input: itemLocationInput, errorEl: document.getElementById("error-location") },
  contact: { input: itemContactInput, errorEl: document.getElementById("error-contact") },
  image: { input: itemImageInput, errorEl: document.getElementById("error-image") },
  description: { input: itemDescriptionInput, errorEl: document.getElementById("error-description") },
  type: { input: null, errorEl: document.getElementById("error-type") },
};

/**
 * Pick the fallback image matching an item's category.
 */
function getFallbackImage(category) {
  return CATEGORY_FALLBACKS[category] || CATEGORY_FALLBACKS.Other;
}

/**
 * Create a clean inline SVG icon safely.
 */
function createSvgIcon(paths) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("meta-icon");

  paths.forEach((d) => {
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  });

  return svg;
}

/**
 * Format an ISO date string into a readable date like "Nov 27, 2026".
 */
function formatDate(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Detect whether contact text is an email or phone number for a direct link.
 */
function buildContactHref(contact, itemName) {
  const value = (contact || "").trim();
  if (value.includes("@") && !/\s/.test(value)) {
    const subject = encodeURIComponent(`Regarding Campus Lost & Found: ${itemName}`);
    return { href: `mailto:${value}?subject=${subject}`, label: "Email Poster" };
  }

  const digitsOnly = value.replace(/[^\d+]/g, "");
  if (digitsOnly.length >= 7 && /^[\d\s\-()+]+$/.test(value)) {
    return { href: `tel:${digitsOnly}`, label: "Call Poster" };
  }

  return null;
}

/**
 * Create a working Copy Contact button.
 */
function createCopyButton(contactText) {
  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "copy-btn";
  copyBtn.textContent = "Copy Contact";

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(contactText);
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy Contact";
        copyBtn.classList.remove("copied");
      }, 1800);
    } catch {
      copyBtn.textContent = "Select text above";
      setTimeout(() => {
        copyBtn.textContent = "Copy Contact";
      }, 1800);
    }
  });

  return copyBtn;
}

/**
 * Create a Mark as Returned / Reopen Post button wired to the backend API.
 */
function createReturnToggleButton(item) {
  const isReturned = item.status === "returned";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `card-action-btn ${isReturned ? "reopen-btn" : "return-btn"}`;
  btn.textContent = isReturned ? "Reopen Post" : "Mark as Returned";

  btn.addEventListener("click", async () => {
    const nextStatus = isReturned ? "open" : "returned";
    btn.disabled = true;
    btn.textContent = "Updating...";
    await toggleItemStatus(item.id, nextStatus);
  });

  return btn;
}

/**
 * Show or hide status banner in the Browse section.
 */
function setBrowseFeedback(message, variant = "info", showRetry = false) {
  if (!message) {
    browseFeedback.classList.add("hidden");
    browseFeedback.classList.remove("info", "success", "error");
    retryFetchBtn.classList.add("hidden");
    return;
  }

  browseFeedbackText.textContent = message;
  browseFeedback.className = `feedback-banner ${variant}`;
  retryFetchBtn.classList.toggle("hidden", !showRetry);
}

/**
 * Show or hide success/error banner inside the report form.
 */
function setFormFeedback(message, variant = "error") {
  if (!message) {
    formFeedback.textContent = "";
    formFeedback.className = "feedback-banner hidden";
    return;
  }

  formFeedback.textContent = message;
  formFeedback.className = `feedback-banner ${variant}`;
}

/**
 * Highlight whichever quick location chip matches the current search query.
 */
function syncLocationChips() {
  const normalized = searchQuery.trim().toLowerCase();
  locationChips.forEach((chip) => {
    const isMatch = normalized !== "" && normalized === chip.dataset.location.toLowerCase();
    chip.classList.toggle("active", isMatch);
  });
}

/**
 * Update an item's status ("open" or "returned") on the backend and refresh the UI.
 */
async function toggleItemStatus(itemId, nextStatus) {
  try {
    const response = await fetch(`/api/items/${encodeURIComponent(itemId)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not update item status.");
    }

    allItems = allItems.map((entry) => (entry.id === itemId ? data.item : entry));
    renderItems();

    if (activeModalItemId === itemId) {
      openItemModal(itemId);
    }

    setBrowseFeedback(data.message || "Item status updated!", "success", false);
  } catch (error) {
    setBrowseFeedback(error.message || "Could not update item status.", "error", false);
    renderItems();
  }
}

/**
 * Switch the modal between View mode and Edit mode.
 */
function showModalEditMode(item) {
  modalViewPane.classList.add("hidden");
  modalEditForm.classList.remove("hidden");
  modalEditError.classList.add("hidden");
  modalEditError.textContent = "";

  editTypeInput.value = item.type === "found" ? "found" : "lost";
  editNameInput.value = item.name || "";
  editCategoryInput.value = item.category || "Other";
  editLocationInput.value = item.location || "";
  editContactInput.value = item.contact || "";
  editDescriptionInput.value = item.description || "";
  editNameInput.focus();
}

function showModalViewMode() {
  modalEditForm.classList.add("hidden");
  modalDeleteConfirm.classList.add("hidden");
  modalViewPane.classList.remove("hidden");
}

/**
 * Open the Item Details popup modal for a given item ID.
 */
function openItemModal(itemId) {
  const item = allItems.find((entry) => entry.id === itemId);
  if (!item) return;

  activeModalItemId = itemId;
  showModalViewMode();

  const normalizedType = item.type === "found" ? "found" : "lost";
  const isReturned = item.status === "returned";

  modalImage.src = item.image || getFallbackImage(item.category);
  modalImage.alt = item.name || "Campus item";
  modalImage.onerror = () => {
    modalImage.src = getFallbackImage(item.category);
  };

  modalStatusBadge.className = `status-badge ${normalizedType}`;
  modalStatusBadge.textContent = normalizedType === "found" ? "Found" : "Lost";
  modalReturnedBadge.classList.toggle("hidden", !isReturned);

  modalCategoryBadge.dataset.category = item.category || "Other";
  modalCategoryBadge.textContent = item.category || "Other";
  modalDate.textContent = formatDate(item.createdAt);

  modalTitle.textContent = item.name;
  modalDescription.textContent = item.description;
  modalLocation.textContent = item.location;
  modalContact.textContent = item.contact;

  modalActions.replaceChildren();
  const directContact = buildContactHref(item.contact, item.name);
  if (directContact) {
    const link = document.createElement("a");
    link.className = "contact-link";
    link.href = directContact.href;
    link.textContent = directContact.label;
    modalActions.appendChild(link);
  }

  modalActions.appendChild(createCopyButton(item.contact));
  modalActions.appendChild(createReturnToggleButton(item));

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "card-action-btn";
  editBtn.textContent = "Edit Details";
  editBtn.addEventListener("click", () => showModalEditMode(item));
  modalActions.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "card-action-btn delete-btn";
  deleteBtn.textContent = "Delete Post";
  deleteBtn.addEventListener("click", () => {
    modalDeleteConfirm.classList.remove("hidden");
  });
  modalActions.appendChild(deleteBtn);

  itemModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  modalCloseBtn.focus();
}

/**
 * Close the Item Details popup modal.
 */
function closeItemModal() {
  activeModalItemId = null;
  showModalViewMode();
  itemModal.classList.add("hidden");
  document.body.style.overflow = "";
}

/**
 * Build one Lost or Found item card with photo, colorful badges, and actions.
 */
function createItemCard(item) {
  const isReturned = item.status === "returned";
  const card = document.createElement("article");
  card.className = `item-card${isReturned ? " is-returned" : ""}`;

  // Top image banner with floating Lost/Found and Returned badges
  const media = document.createElement("div");
  media.className = "card-media";
  media.setAttribute("role", "button");
  media.setAttribute("tabindex", "0");
  media.setAttribute("aria-label", `View details for ${item.name}`);

  const img = document.createElement("img");
  img.className = "card-image";
  img.loading = "lazy";
  img.alt = item.name || "Campus item";
  img.src = item.image || getFallbackImage(item.category);
  img.addEventListener("error", () => {
    img.src = getFallbackImage(item.category);
  });

  const normalizedType = item.type === "found" ? "found" : "lost";
  const statusBadge = document.createElement("span");
  statusBadge.className = `status-badge ${normalizedType}`;
  statusBadge.textContent = normalizedType === "found" ? "Found" : "Lost";

  media.append(img, statusBadge);

  if (isReturned) {
    const returnedBadge = document.createElement("span");
    returnedBadge.className = "returned-badge";
    returnedBadge.textContent = "Returned";
    media.appendChild(returnedBadge);
  }

  media.addEventListener("click", () => openItemModal(item.id));
  media.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openItemModal(item.id);
    }
  });

  // Card text & details body
  const content = document.createElement("div");
  content.className = "card-content";

  const topMeta = document.createElement("div");
  topMeta.className = "card-top";

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "category-badge";
  categoryBadge.dataset.category = item.category || "Other";
  categoryBadge.textContent = item.category || "Other";

  const dateEl = document.createElement("span");
  dateEl.className = "item-date";
  dateEl.textContent = formatDate(item.createdAt);

  topMeta.append(categoryBadge, dateEl);

  const body = document.createElement("div");
  const titleEl = document.createElement("h3");
  titleEl.className = "item-title";
  titleEl.textContent = item.name;

  const descEl = document.createElement("p");
  descEl.className = "item-description";
  descEl.textContent = item.description;

  body.append(topMeta, titleEl, descEl);

  // Footer: Location, Contact details, Contact Poster & Return/Details buttons
  const meta = document.createElement("div");
  meta.className = "card-meta";

  const locationRow = document.createElement("div");
  locationRow.className = "meta-row";
  locationRow.appendChild(
    createSvgIcon([
      "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z",
      "M12 7a3 3 0 1 0 0 6 3 3 0 1 0 0-6z",
    ])
  );
  const locationText = document.createElement("span");
  const locationLabel = document.createElement("span");
  locationLabel.className = "meta-label";
  locationLabel.textContent = "Location:";
  locationText.append(locationLabel, document.createTextNode(item.location));
  locationRow.appendChild(locationText);

  const contactRow = document.createElement("div");
  contactRow.className = "meta-row";
  contactRow.appendChild(
    createSvgIcon([
      "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z",
      "M22 6l-10 7L2 6",
    ])
  );
  const contactText = document.createElement("span");
  const contactLabel = document.createElement("span");
  contactLabel.className = "meta-label";
  contactLabel.textContent = "Contact:";
  contactText.append(contactLabel, document.createTextNode(item.contact));
  contactRow.appendChild(contactText);

  const actionsRow = document.createElement("div");
  actionsRow.className = "contact-actions";

  const directContact = buildContactHref(item.contact, item.name);
  if (directContact) {
    const link = document.createElement("a");
    link.className = "contact-link";
    link.href = directContact.href;
    link.textContent = directContact.label;
    actionsRow.appendChild(link);
  }
  actionsRow.appendChild(createCopyButton(item.contact));

  const extraRow = document.createElement("div");
  extraRow.className = "card-extra-actions";

  const detailsBtn = document.createElement("button");
  detailsBtn.type = "button";
  detailsBtn.className = "card-action-btn";
  detailsBtn.textContent = "View Details";
  detailsBtn.addEventListener("click", () => openItemModal(item.id));

  extraRow.append(detailsBtn, createReturnToggleButton(item));

  meta.append(locationRow, contactRow, actionsRow, extraRow);
  content.append(body, meta);
  card.append(media, content);

  return card;
}

/**
 * Filter, sort, and render item cards.
 */
function renderItems() {
  const query = searchQuery.trim().toLowerCase();
  syncLocationChips();

  const filteredItems = allItems
    .filter((item) => {
      const matchesType = activeFilter === "all" || item.type === activeFilter;
      if (!matchesType) return false;

      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      if (!matchesCategory) return false;

      if (hideReturned && item.status === "returned") return false;

      if (!query) return true;

      const nameMatch = (item.name || "").toLowerCase().includes(query);
      const categoryMatch = (item.category || "").toLowerCase().includes(query);
      const locationMatch = (item.location || "").toLowerCase().includes(query);
      return nameMatch || categoryMatch || locationMatch;
    })
    .sort((a, b) => {
      const diff = new Date(b.createdAt) - new Date(a.createdAt);
      return sortOrder === "oldest" ? -diff : diff;
    });

  itemsCount.textContent =
    filteredItems.length === 1 ? "1 item shown" : `${filteredItems.length} items shown`;

  itemsGrid.replaceChildren();

  if (filteredItems.length === 0) {
    emptyState.classList.remove("hidden");
    if (allItems.length === 0) {
      emptyStateMessage.textContent = "No items have been posted yet. Report an item below!";
      resetFiltersBtn.classList.add("hidden");
    } else {
      emptyStateMessage.textContent = "No items matched your search or filter. Try another keyword or view all items.";
      resetFiltersBtn.classList.remove("hidden");
    }
    return;
  }

  emptyState.classList.add("hidden");

  const fragment = document.createDocumentFragment();
  filteredItems.forEach((item) => {
    fragment.appendChild(createItemCard(item));
  });
  itemsGrid.appendChild(fragment);
}

/**
 * Load all saved items from the Express backend.
 */
async function fetchItems() {
  setBrowseFeedback("Loading campus items...", "info", false);

  try {
    const response = await fetch("/api/items");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load items.");
    }

    allItems = Array.isArray(data.items) ? data.items : [];
    setBrowseFeedback("");
    renderItems();
  } catch (error) {
    itemsCount.textContent = "Unavailable";
    setBrowseFeedback(
      error.message || "Could not connect to the server. Make sure the backend is running.",
      "error",
      true
    );
  }
}

/**
 * Clear inline validation errors.
 */
function clearFieldErrors() {
  Object.values(fieldMap).forEach(({ input, errorEl }) => {
    if (input) input.classList.remove("invalid");
    if (errorEl) errorEl.textContent = "";
  });
}

/**
 * Display inline validation errors next to fields.
 */
function showFieldErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const entry = fieldMap[field];
    if (!entry) return;
    if (entry.input) entry.input.classList.add("invalid");
    if (entry.errorEl) entry.errorEl.textContent = message;
  });
}

/**
 * Reset the optional image upload input and preview.
 */
function clearSelectedImage() {
  uploadedImageDataUrl = "";
  itemImageInput.value = "";
  imagePreview.src = "";
  imagePreviewBox.classList.add("hidden");
}

/**
 * Validate item form inputs before sending to the backend.
 */
function validateFormValues(values) {
  const errors = {};

  if (values.type !== "lost" && values.type !== "found") {
    errors.type = "Please choose Lost Item or Found Item.";
  }

  if (values.name.length < 2 || values.name.length > 80) {
    errors.name = "Please enter an item name (2 to 80 characters).";
  }

  if (!values.category) {
    errors.category = "Please select a category.";
  }

  if (values.location.length < 2 || values.location.length > 80) {
    errors.location = "Please enter the campus location (2 to 80 characters).";
  }

  if (values.contact.length < 5 || values.contact.length > 100) {
    errors.contact = "Please enter a valid email address or phone number.";
  }

  if (values.description.length < 5 || values.description.length > 400) {
    errors.description = "Please add a short description (5 to 400 characters).";
  }

  return errors;
}

/**
 * Switch the active Lost / Found / All filter tab.
 */
function setActiveFilter(filterValue) {
  activeFilter = filterValue;

  filterButtons.forEach((button) => {
    const isSelected = button.dataset.filter === filterValue;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  renderItems();
}

/**
 * Reset all search, category, sort, type, and returned filters.
 */
function resetAllFilters() {
  searchInput.value = "";
  searchQuery = "";
  clearSearchBtn.classList.add("hidden");

  activeCategory = "all";
  categoryFilter.value = "all";

  sortOrder = "newest";
  sortSelect.value = "newest";

  hideReturned = false;
  hideReturnedToggle.checked = false;

  setActiveFilter("all");
}

// ---------- Event Listeners ----------

findItemBtn.addEventListener("click", () => {
  document.getElementById("browse-section").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => searchInput.focus({ preventScroll: true }), 350);
});

reportItemBtn.addEventListener("click", () => {
  document.getElementById("report-section").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => itemNameInput.focus({ preventScroll: true }), 350);
});

searchInput.addEventListener("input", (event) => {
  searchQuery = event.target.value;
  clearSearchBtn.classList.toggle("hidden", searchQuery.length === 0);
  renderItems();
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchQuery = "";
  clearSearchBtn.classList.add("hidden");
  renderItems();
  searchInput.focus();
});

locationChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const spot = chip.dataset.location;
    if (searchQuery.trim().toLowerCase() === spot.toLowerCase()) {
      searchInput.value = "";
      searchQuery = "";
    } else {
      searchInput.value = spot;
      searchQuery = spot;
    }
    clearSearchBtn.classList.toggle("hidden", searchQuery.length === 0);
    renderItems();
  });
});

categoryFilter.addEventListener("change", (event) => {
  activeCategory = event.target.value;
  renderItems();
});

sortSelect.addEventListener("change", (event) => {
  sortOrder = event.target.value;
  renderItems();
});

hideReturnedToggle.addEventListener("change", (event) => {
  hideReturned = event.target.checked;
  renderItems();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveFilter(button.dataset.filter);
  });
});

resetFiltersBtn.addEventListener("click", resetAllFilters);
retryFetchBtn.addEventListener("click", fetchItems);

// Modal listeners (view, edit, delete, close)
modalCloseBtn.addEventListener("click", closeItemModal);
modalBackdrop.addEventListener("click", closeItemModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !itemModal.classList.contains("hidden")) {
    closeItemModal();
  }
});

cancelEditBtn.addEventListener("click", showModalViewMode);
cancelDeleteBtn.addEventListener("click", () => {
  modalDeleteConfirm.classList.add("hidden");
});

confirmDeleteBtn.addEventListener("click", async () => {
  if (!activeModalItemId) return;
  const targetId = activeModalItemId;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = "Deleting...";

  try {
    const response = await fetch(`/api/items/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not delete post.");
    }

    allItems = allItems.filter((entry) => entry.id !== targetId);
    closeItemModal();
    renderItems();
    setBrowseFeedback(data.message || "Post deleted.", "success", false);
  } catch (error) {
    closeItemModal();
    setBrowseFeedback(error.message || "Could not delete post.", "error", false);
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = "Yes, Delete";
  }
});

modalEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeModalItemId) return;

  modalEditError.classList.add("hidden");
  modalEditError.textContent = "";

  const updatedValues = {
    type: editTypeInput.value,
    name: editNameInput.value.trim(),
    category: editCategoryInput.value.trim(),
    location: editLocationInput.value.trim(),
    contact: editContactInput.value.trim(),
    description: editDescriptionInput.value.trim(),
  };

  const validationErrors = validateFormValues(updatedValues);
  const firstError = Object.values(validationErrors)[0];
  if (firstError) {
    modalEditError.textContent = firstError;
    modalEditError.classList.remove("hidden");
    return;
  }

  saveEditBtn.disabled = true;
  saveEditBtn.textContent = "Saving...";

  try {
    const response = await fetch(`/api/items/${encodeURIComponent(activeModalItemId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedValues),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not update item.");
    }

    allItems = allItems.map((entry) => (entry.id === activeModalItemId ? data.item : entry));
    renderItems();
    openItemModal(activeModalItemId);
    setBrowseFeedback(data.message || "Item details updated!", "success", false);
  } catch (error) {
    modalEditError.textContent = error.message || "Could not save changes.";
    modalEditError.classList.remove("hidden");
  } finally {
    saveEditBtn.disabled = false;
    saveEditBtn.textContent = "Save Changes";
  }
});

itemDescriptionInput.addEventListener("input", () => {
  charCount.textContent = `${itemDescriptionInput.value.length} / 400`;
});

// Handle optional image file selection and preview
itemImageInput.addEventListener("change", () => {
  fieldMap.image.errorEl.textContent = "";
  const file = itemImageInput.files && itemImageInput.files[0];

  if (!file) {
    clearSelectedImage();
    return;
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    clearSelectedImage();
    fieldMap.image.errorEl.textContent = "Please choose a PNG, JPG, GIF, or WebP image.";
    return;
  }

  if (file.size > 1.8 * 1024 * 1024) {
    clearSelectedImage();
    fieldMap.image.errorEl.textContent = "Photo is too large. Please choose one under 1.8 MB.";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    uploadedImageDataUrl = typeof reader.result === "string" ? reader.result : "";
    imagePreview.src = uploadedImageDataUrl;
    imagePreviewBox.classList.remove("hidden");
  };
  reader.readAsDataURL(file);
});

removeImageBtn.addEventListener("click", clearSelectedImage);

Object.values(fieldMap).forEach(({ input, errorEl }) => {
  if (!input) return;
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    if (errorEl) errorEl.textContent = "";
  });
});

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors();
  setFormFeedback("");

  const selectedTypeInput = reportForm.querySelector('input[name="type"]:checked');

  const formValues = {
    type: selectedTypeInput ? selectedTypeInput.value : "",
    name: itemNameInput.value.trim(),
    category: itemCategoryInput.value.trim(),
    location: itemLocationInput.value.trim(),
    contact: itemContactInput.value.trim(),
    description: itemDescriptionInput.value.trim(),
    image: uploadedImageDataUrl,
  };

  const validationErrors = validateFormValues(formValues);
  if (Object.keys(validationErrors).length > 0) {
    showFieldErrors(validationErrors);
    setFormFeedback("Please fix the highlighted fields before posting.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Posting...";

  try {
    const response = await fetch("/api/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formValues),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.fieldErrors) {
        showFieldErrors(data.fieldErrors);
      }
      throw new Error(data.error || "Could not post your item.");
    }

    reportForm.reset();
    clearSelectedImage();
    charCount.textContent = "0 / 400";
    resetAllFilters();

    await fetchItems();
    setFormFeedback(
      "Your item has been posted! You can see it right away in the Browse Items list above.",
      "success"
    );
  } catch (error) {
    setFormFeedback(
      error.message || "Something went wrong while posting your item. Please try again.",
      "error"
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Post Item";
  }
});

document.addEventListener("DOMContentLoaded", fetchItems);
