const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Where our saved lost & found items and images live
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "items.json");
const IMAGES_DIR = path.join(__dirname, "images");

const VALID_TYPES = ["lost", "found"];
const VALID_STATUSES = ["open", "returned"];

// Allow Express to read JSON (including optional uploaded photo data URLs)
app.use(express.json({ limit: "3mb" }));

// Catch invalid JSON sent in requests
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Invalid request data format." });
  }
  next(err);
});

/**
 * Make sure the data folder and items.json file exist before reading or writing.
 */
function ensureDataFileExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

/**
 * Read all items from data/items.json.
 */
function readItems() {
  ensureDataFileExists();
  const raw = fs.readFileSync(DATA_FILE, "utf8").trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Save all items back into data/items.json.
 */
function writeItems(items) {
  ensureDataFileExists();
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

/**
 * Check that all submitted fields are present and within safe lengths.
 */
function validateItemInput(body) {
  const fieldErrors = {};

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const type = typeof body.type === "string" ? body.type.trim().toLowerCase() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const location = typeof body.location === "string" ? body.location.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";

  if (name.length < 2 || name.length > 80) {
    fieldErrors.name = "Please enter an item name (2 to 80 characters).";
  }

  if (!VALID_TYPES.includes(type)) {
    fieldErrors.type = "Please choose whether the item was Lost or Found.";
  }

  if (category.length < 2 || category.length > 50) {
    fieldErrors.category = "Please select a category.";
  }

  if (location.length < 2 || location.length > 80) {
    fieldErrors.location = "Please enter the campus location (2 to 80 characters).";
  }

  if (contact.length < 5 || contact.length > 100) {
    fieldErrors.contact = "Please enter a valid email address or phone number.";
  }

  if (description.length < 5 || description.length > 400) {
    fieldErrors.description = "Please add a short description (5 to 400 characters).";
  }

  if (image) {
    const isLocalImage = /^\/images\/[a-zA-Z0-9._-]+$/.test(image);
    const isSafeDataUrl = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image);

    if (!isLocalImage && !isSafeDataUrl) {
      fieldErrors.image = "Please upload a valid PNG, JPG, GIF, or WebP image.";
    } else if (image.length > 2_600_000) {
      fieldErrors.image = "Image is too large. Please choose a photo under 1.8 MB.";
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    sanitized: {
      name,
      type,
      category,
      location,
      contact,
      description,
      image,
    },
  };
}

// Serve only our frontend files and images folder (keeps server.js and data/items.json private)
app.use("/images", express.static(IMAGES_DIR));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/styles.css", (req, res) => {
  res.sendFile(path.join(__dirname, "styles.css"));
});

app.get("/app.js", (req, res) => {
  res.sendFile(path.join(__dirname, "app.js"));
});

// GET /api/items — Return all items (supports optional ?type=lost|found and ?search=...)
app.get("/api/items", (req, res) => {
  try {
    let items = readItems();

    const typeFilter = typeof req.query.type === "string" ? req.query.type.trim().toLowerCase() : "";
    const categoryFilter = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : "";
    const statusFilter = typeof req.query.status === "string" ? req.query.status.trim().toLowerCase() : "";
    const searchFilter = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";

    // Normalize missing status on older records to "open"
    items = items.map((item) => ({
      ...item,
      status: VALID_STATUSES.includes(item.status) ? item.status : "open",
    }));

    if (VALID_TYPES.includes(typeFilter)) {
      items = items.filter((item) => item.type === typeFilter);
    }

    if (categoryFilter && categoryFilter !== "all") {
      items = items.filter((item) => (item.category || "").toLowerCase() === categoryFilter);
    }

    if (VALID_STATUSES.includes(statusFilter)) {
      items = items.filter((item) => item.status === statusFilter);
    }

    if (searchFilter) {
      items = items.filter((item) => {
        const nameMatch = (item.name || "").toLowerCase().includes(searchFilter);
        const categoryMatch = (item.category || "").toLowerCase().includes(searchFilter);
        const locationMatch = (item.location || "").toLowerCase().includes(searchFilter);
        return nameMatch || categoryMatch || locationMatch;
      });
    }

    // Show newest posts at the top
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ items });
  } catch (error) {
    console.error("Error reading items:", error);
    res.status(500).json({ error: "Could not load items right now. Please try again." });
  }
});

// POST /api/items — Validate and save a new lost or found item
app.post("/api/items", (req, res) => {
  try {
    const result = validateItemInput(req.body || {});

    if (!result.valid) {
      return res.status(400).json({
        error: "Please fix the highlighted fields before submitting.",
        fieldErrors: result.fieldErrors,
      });
    }

    const newItem = {
      id: `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      ...result.sanitized,
      status: "open",
      createdAt: new Date().toISOString(),
    };

    const items = readItems();
    items.unshift(newItem);
    writeItems(items);

    res.status(201).json({
      message: "Your item has been posted successfully!",
      item: newItem,
    });
  } catch (error) {
    console.error("Error saving item:", error);
    res.status(500).json({ error: "Could not save your item. Please try again." });
  }
});

// PATCH /api/items/:id/status — Toggle an item between "open" and "returned"
app.patch("/api/items/:id/status", (req, res) => {
  try {
    const itemId = req.params.id;
    const requestedStatus = typeof req.body?.status === "string" ? req.body.status.trim().toLowerCase() : "";

    if (!VALID_STATUSES.includes(requestedStatus)) {
      return res.status(400).json({ error: "Status must be 'open' or 'returned'." });
    }

    const items = readItems();
    const index = items.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return res.status(404).json({ error: "Item not found." });
    }

    items[index] = {
      ...items[index],
      status: requestedStatus,
    };

    writeItems(items);

    res.json({
      message:
        requestedStatus === "returned"
          ? "Item marked as returned!"
          : "Item reopened and marked as active.",
      item: items[index],
    });
  } catch (error) {
    console.error("Error updating item status:", error);
    res.status(500).json({ error: "Could not update item status. Please try again." });
  }
});

// PUT /api/items/:id — Edit an existing item's details
app.put("/api/items/:id", (req, res) => {
  try {
    const itemId = req.params.id;
    const items = readItems();
    const index = items.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return res.status(404).json({ error: "Item not found." });
    }

    const payload = {
      ...req.body,
      image: typeof req.body?.image === "string" ? req.body.image : items[index].image || "",
    };

    const result = validateItemInput(payload);
    if (!result.valid) {
      return res.status(400).json({
        error: "Please fix the highlighted fields before saving changes.",
        fieldErrors: result.fieldErrors,
      });
    }

    items[index] = {
      ...items[index],
      ...result.sanitized,
      updatedAt: new Date().toISOString(),
    };

    writeItems(items);

    res.json({
      message: "Item details updated successfully!",
      item: items[index],
    });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Could not update item. Please try again." });
  }
});

// DELETE /api/items/:id — Remove an item post permanently
app.delete("/api/items/:id", (req, res) => {
  try {
    const itemId = req.params.id;
    const items = readItems();
    const index = items.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return res.status(404).json({ error: "Item not found." });
    }

    items.splice(index, 1);
    writeItems(items);

    res.json({
      message: "Post deleted successfully.",
      id: itemId,
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Could not delete item. Please try again." });
  }
});

// Handle unknown API routes cleanly
app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});

// Global error fallback
app.use((err, req, res, next) => {
  console.error("Unexpected server error:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

ensureDataFileExists();

app.listen(PORT, () => {
  console.log(`Campus Lost & Found Portal is running at http://localhost:${PORT}`);
});
