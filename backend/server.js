require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret-now";

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

const promptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "General", trim: true },
    promptText: { type: String, required: true, trim: true },
    notes: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    tagsText: { type: String, default: "" },
    favorite: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    trashed: { type: Boolean, default: false },
    color: { type: String, default: "indigo" },
    useCount: { type: Number, default: 0 },
    lastCopiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Prompt = mongoose.model("Prompt", promptSchema);

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeTags(input) {
  if (Array.isArray(input)) {
    return input.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function parsePromptInput(body) {
  const tags = normalizeTags(body.tags ?? body.tagsInput ?? body.tagsText ?? "");
  const category = String(body.category || "General").trim() || "General";

  return {
    title: String(body.title || "").trim(),
    category,
    promptText: String(body.promptText || "").trim(),
    notes: String(body.notes || "").trim(),
    tags,
    tagsText: tags.join(" "),
    color: String(body.color || "indigo").trim() || "indigo",
    favorite: typeof body.favorite === "boolean" ? body.favorite : undefined,
  };
}

function promptViewQuery(view) {
  if (view === "trash") {
    return { trashed: true };
  }

  if (view === "archived") {
    return { trashed: false, archived: true };
  }

  if (view === "all") {
    return { trashed: false };
  }

  return { trashed: false, archived: false };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Login failed" });
  }
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load profile" });
  }
});

app.get("/api/prompts/stats", authRequired, async (req, res) => {
  try {
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const [
      total,
      active,
      archived,
      trash,
      favorites,
      categoryBreakdown,
      recentPrompts,
    ] = await Promise.all([
      Prompt.countDocuments({ userId: userObjectId, trashed: false }),
      Prompt.countDocuments({ userId: userObjectId, trashed: false, archived: false }),
      Prompt.countDocuments({ userId: userObjectId, trashed: false, archived: true }),
      Prompt.countDocuments({ userId: userObjectId, trashed: true }),
      Prompt.countDocuments({ userId: userObjectId, trashed: false, favorite: true }),
      Prompt.aggregate([
        { $match: { userId: userObjectId, trashed: false } },
        {
          $group: {
            _id: "$category",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Prompt.find({ userId: userObjectId, trashed: false })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("title category updatedAt favorite archived"),
    ]);

    return res.json({
      total,
      active,
      archived,
      trash,
      favorites,
      categories: categoryBreakdown.length,
      categoryBreakdown,
      recentPrompts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load stats" });
  }
});

app.get("/api/prompts", authRequired, async (req, res) => {
  try {
    const view = String(req.query.view || "active").trim();
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "all").trim();
    const favorite = String(req.query.favorite || "all").trim();
    const sort = String(req.query.sort || "newest").trim();

    const query = {
      userId: req.user.id,
      ...promptViewQuery(view),
    };

    if (category !== "all" && category) {
      query.category = new RegExp(`^${escapeRegex(category)}$`, "i");
    }

    if (favorite === "true") {
      query.favorite = true;
    } else if (favorite === "false") {
      query.favorite = false;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      query.$or = [
        { title: searchRegex },
        { promptText: searchRegex },
        { notes: searchRegex },
        { category: searchRegex },
        { tagsText: searchRegex },
      ];
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      title: { title: 1 },
      updated: { updatedAt: -1 },
      useCount: { useCount: -1, updatedAt: -1 },
    };

    const prompts = await Prompt.find(query).sort(sortMap[sort] || sortMap.newest);

    return res.json(prompts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load prompts" });
  }
});

app.get("/api/prompts/:id", authRequired, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    return res.json(prompt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not load prompt" });
  }
});

app.post("/api/prompts", authRequired, async (req, res) => {
  try {
    const payload = parsePromptInput(req.body);

    if (!payload.title || !payload.promptText) {
      return res.status(400).json({ message: "Title and prompt text are required" });
    }

    const prompt = await Prompt.create({
      userId: req.user.id,
      title: payload.title,
      category: payload.category,
      promptText: payload.promptText,
      notes: payload.notes,
      tags: payload.tags,
      tagsText: payload.tagsText,
      favorite: typeof payload.favorite === "boolean" ? payload.favorite : false,
      archived: false,
      trashed: false,
      color: payload.color,
      useCount: 0,
      lastCopiedAt: null,
    });

    return res.status(201).json(prompt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not create prompt" });
  }
});

app.put("/api/prompts/:id", authRequired, async (req, res) => {
  try {
    const existing = await Prompt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    const payload = parsePromptInput(req.body);

    if (!payload.title || !payload.promptText) {
      return res.status(400).json({ message: "Title and prompt text are required" });
    }

    existing.title = payload.title;
    existing.category = payload.category;
    existing.promptText = payload.promptText;
    existing.notes = payload.notes;
    existing.tags = payload.tags;
    existing.tagsText = payload.tagsText;
    existing.color = payload.color;

    if (typeof payload.favorite === "boolean") {
      existing.favorite = payload.favorite;
    }

    await existing.save();
    return res.json(existing);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update prompt" });
  }
});

app.patch("/api/prompts/:id/favorite", authRequired, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    if (typeof req.body.favorite === "boolean") {
      prompt.favorite = req.body.favorite;
    } else {
      prompt.favorite = !prompt.favorite;
    }

    await prompt.save();
    return res.json(prompt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update favorite state" });
  }
});

app.patch("/api/prompts/:id/archive", authRequired, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, userId: req.user.id, trashed: false });
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    if (typeof req.body.archived === "boolean") {
      prompt.archived = req.body.archived;
    } else {
      prompt.archived = !prompt.archived;
    }

    await prompt.save();
    return res.json(prompt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update archive state" });
  }
});

app.patch("/api/prompts/:id/restore", authRequired, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    prompt.trashed = false;
    prompt.archived = false;
    await prompt.save();

    return res.json(prompt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not restore prompt" });
  }
});

app.patch("/api/prompts/:id/use", authRequired, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    prompt.useCount += 1;
    prompt.lastCopiedAt = new Date();
    await prompt.save();

    return res.json(prompt);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not update use count" });
  }
});

app.post("/api/prompts/:id/duplicate", authRequired, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, userId: req.user.id, trashed: false });
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    const copy = await Prompt.create({
      userId: req.user.id,
      title: `${prompt.title} (Copy)`,
      category: prompt.category,
      promptText: prompt.promptText,
      notes: prompt.notes,
      tags: prompt.tags,
      tagsText: prompt.tagsText,
      favorite: false,
      archived: false,
      trashed: false,
      color: prompt.color,
      useCount: 0,
      lastCopiedAt: null,
    });

    return res.status(201).json(copy);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not duplicate prompt" });
  }
});

app.delete("/api/prompts/:id", authRequired, async (req, res) => {
  try {
    const prompt = await Prompt.findOne({ _id: req.params.id, userId: req.user.id });
    if (!prompt) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    prompt.trashed = true;
    prompt.archived = false;
    await prompt.save();

    return res.json({ message: "Prompt moved to trash" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not move prompt to trash" });
  }
});

app.delete("/api/prompts/:id/permanent", authRequired, async (req, res) => {
  try {
    const deleted = await Prompt.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Prompt not found" });
    }

    return res.json({ message: "Prompt permanently deleted" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Could not permanently delete prompt" });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});