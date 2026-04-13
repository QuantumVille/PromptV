<template>
  <div class="app-shell" :class="theme">
    <div class="bg-orb orb-one"></div>
    <div class="bg-orb orb-two"></div>

    <transition-group name="toast" tag="div" class="toast-stack">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
      >
        <span class="toast-dot"></span>
        <span>{{ toast.message }}</span>
      </div>
    </transition-group>

    <section v-if="!isLoggedIn" class="auth-screen">
      <div class="auth-hero panel glass">
        <p class="eyebrow">PromptVault</p>
        <h1>Save, organize, refine, and reuse your best ideas.</h1>
        <p class="hero-copy">
          An all-in-one productivity dashboard for organizing, refining, and managing project ideas, digital workflows, and AI prompts—
          designed to streamline tasks and maximize efficiency across your work.
        </p>

        <div class="feature-list">
          <div class="feature-item">Accounts and login info</div>
          <div class="feature-item">User-specific idea</div>
          <div class="feature-item">Search, filter, and sort</div>
          <div class="feature-item">Favorites, archive, and trash</div>
          <div class="feature-item">Copy and duplicate prompts</div>
          <div class="feature-item">Theme toggle</div>
        </div>
      </div>

      <div class="auth-card panel">
        <div class="auth-switch">
          <button
            type="button"
            :class="{ active: authMode === 'login' }"
            @click="authMode = 'login'"
          >
            Log in
          </button>
          <button
            type="button"
            :class="{ active: authMode === 'register' }"
            @click="authMode = 'register'"
          >
            Sign up
          </button>
        </div>

        <form class="auth-form" @submit.prevent="submitAuth">
          <h2>{{ authMode === 'login' ? 'Welcome back' : 'Create your account' }}</h2>

          <div v-if="authMode === 'register'" class="field">
            <label for="name">Name</label>
            <input id="name" v-model.trim="name" type="text" placeholder="Your name" />
          </div>

          <div class="field">
            <label for="email">Email</label>
            <input id="email" v-model.trim="email" type="email" placeholder="you@example.com" />
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" v-model="password" type="password" placeholder="At least 6 characters" />
          </div>

          <button class="primary-button" type="submit" :disabled="authBusy">
            {{ authBusy ? "Please wait..." : authMode === 'login' ? 'Log in' : 'Create account' }}
          </button>

          <p class="small-note">
            Everything is stored per account, so each user sees only their own prompts.
          </p>
        </form>
      </div>
    </section>

    <section v-else class="dashboard">
      <header class="topbar panel glass">
        <div class="topbar-left">
          <p class="eyebrow">PromptVault</p>
          <h1>Welcome, {{ user.name }}</h1>
          <p class="subtitle">Build a prompt library that looks and feels premium.</p>
        </div>

        <div class="topbar-right">
          <button class="ghost-button" type="button" @click="toggleTheme">
            {{ theme === 'dark' ? 'Light mode' : 'Dark mode' }}
          </button>
          <button class="ghost-button" type="button" @click="logout">
            Log out
          </button>
        </div>
      </header>

      <section class="stats-grid">
        <article class="stat-card panel" v-for="card in statCards" :key="card.label">
          <p>{{ card.label }}</p>
          <strong>{{ card.value }}</strong>
        </article>
      </section>

      <section class="insights-grid">
        <div class="panel insight-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Activity</p>
              <h2>Recent prompts</h2>
            </div>
          </div>

          <div v-if="stats.recentPrompts.length === 0" class="mini-empty">
            No recent prompts yet.
          </div>

          <div v-else class="recent-list">
            <article v-for="item in stats.recentPrompts" :key="item._id" class="recent-card">
              <div class="recent-title">{{ item.title }}</div>
              <div class="recent-meta">
                {{ item.category }} • {{ formatDate(item.updatedAt) }}
              </div>
            </article>
          </div>
        </div>

        <div class="panel insight-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Breakdown</p>
              <h2>Category breakdown</h2>
            </div>
          </div>

          <div v-if="stats.categoryBreakdown.length === 0" class="mini-empty">
            No categories yet.
          </div>

          <div v-else class="breakdown-list">
            <div v-for="item in stats.categoryBreakdown" :key="item._id" class="breakdown-row">
              <div class="breakdown-head">
                <span>{{ item._id }}</span>
                <strong>{{ item.count }}</strong>
              </div>
              <div class="bar">
                <div class="bar-fill" :style="{ width: categoryBarWidth(item.count) }"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="toolbar panel">
        <div class="tab-row">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="tab-button"
            :class="{ active: view === tab.value }"
            @click="view = tab.value"
          >
            <span>{{ tab.label }}</span>
            <strong>{{ tab.count }}</strong>
          </button>
        </div>

        <div class="filters-grid">
          <div class="field">
            <label for="search">Search</label>
            <input
              id="search"
              v-model.trim="search"
              type="text"
              placeholder="Search title, text, notes, category, or tags"
            />
          </div>

          <div class="field">
            <label for="categoryFilter">Category</label>
            <select id="categoryFilter" v-model="categoryFilter">
              <option value="all">All categories</option>
              <option v-for="category in categoryOptions" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </div>

          <div class="field">
            <label for="favoriteFilter">Favorites</label>
            <select id="favoriteFilter" v-model="favoriteFilter">
              <option value="all">All prompts</option>
              <option value="true">Favorites only</option>
              <option value="false">Not favorites</option>
            </select>
          </div>

          <div class="field">
            <label for="sortBy">Sort</label>
            <select id="sortBy" v-model="sortBy">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="updated">Recently updated</option>
              <option value="title">Title</option>
              <option value="useCount">Most used</option>
            </select>
          </div>

          <button class="secondary-button" type="button" @click="exportPrompts">
            Export JSON
          </button>

          <button class="secondary-button" type="button" @click="clearFilters">
            Reset filters
          </button>
        </div>
      </section>

      <section class="content-grid">
        <aside class="panel form-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">{{ editingId ? 'Editing prompt' : 'New prompt' }}</p>
              <h2>{{ editingId ? 'Update prompt' : 'Create prompt' }}</h2>
            </div>
            <span class="badge">{{ editingId ? 'Edit mode' : 'Fresh entry' }}</span>
          </div>

          <form class="prompt-form" @submit.prevent="savePrompt">
            <div class="field">
              <label for="title">Title</label>
              <input id="title" v-model.trim="title" type="text" placeholder="Prompt title" />
            </div>

            <div class="field-row">
              <div class="field">
                <label for="category">Category</label>
                <input id="category" v-model.trim="category" type="text" placeholder="Writing, coding, research..." />
              </div>

              <div class="field">
                <label for="color">Accent</label>
                <select id="color" v-model="color">
                  <option value="indigo">Indigo</option>
                  <option value="sky">Sky</option>
                  <option value="emerald">Emerald</option>
                  <option value="rose">Rose</option>
                  <option value="amber">Amber</option>
                  <option value="violet">Violet</option>
                </select>
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="tagsInput">Tags</label>
                <input
                  id="tagsInput"
                  v-model.trim="tagsInput"
                  type="text"
                  placeholder="comma, separated, tags"
                />
              </div>

              <div class="field checkbox-field">
                <label>
                  <input v-model="favorite" type="checkbox" />
                  Mark as favorite
                </label>
              </div>
            </div>

            <div class="field">
              <label for="notes">Notes</label>
              <textarea
                id="notes"
                v-model.trim="notes"
                rows="3"
                placeholder="Quick notes or context"
              ></textarea>
            </div>

            <div class="field">
              <label for="promptText">Prompt</label>
              <textarea
                id="promptText"
                v-model.trim="promptText"
                rows="9"
                placeholder="Write the full prompt here..."
              ></textarea>
            </div>

            <div class="form-actions">
              <button class="primary-button" type="submit" :disabled="savingPrompt">
                {{ savingPrompt ? "Saving..." : editingId ? "Update prompt" : "Save prompt" }}
              </button>
              <button v-if="editingId" class="ghost-button" type="button" @click="cancelEdit">
                Cancel
              </button>
            </div>
          </form>
        </aside>

        <main class="panel list-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">{{ currentViewLabel }}</p>
              <h2>{{ prompts.length }} prompt{{ prompts.length === 1 ? '' : 's' }}</h2>
            </div>

            <div class="header-actions">
              <button class="ghost-button" type="button" @click="refreshData" :disabled="loadingPrompts || loadingStats">
                Refresh
              </button>
            </div>
          </div>

          <div v-if="loadingPrompts" class="empty-state">
            Loading prompts...
          </div>

          <div v-else-if="prompts.length === 0" class="empty-state">
            <h3>No prompts found</h3>
            <p>
              Create a new prompt or change your filters to see more results.
            </p>
          </div>

          <div v-else class="prompt-grid">
            <article
              v-for="prompt in prompts"
              :key="prompt._id"
              class="prompt-card"
              :style="{ '--accent': accentColor(prompt.color) }"
            >
              <div class="prompt-card-top">
                <div>
                  <h3>{{ prompt.title }}</h3>
                  <p class="prompt-meta">
                    <span>{{ prompt.category }}</span>
                    <span>Used {{ prompt.useCount || 0 }} time{{ (prompt.useCount || 0) === 1 ? '' : 's' }}</span>
                  </p>
                </div>

                <button
                  class="star-button"
                  type="button"
                  @click="toggleFavorite(prompt)"
                  :title="prompt.favorite ? 'Remove favorite' : 'Mark as favorite'"
                >
                  {{ prompt.favorite ? "★" : "☆" }}
                </button>
              </div>

              <div class="chip-row" v-if="prompt.tags && prompt.tags.length">
                <span v-for="tag in prompt.tags" :key="tag" class="chip">{{ tag }}</span>
              </div>

              <p v-if="prompt.notes" class="notes-text">{{ prompt.notes }}</p>

              <div class="prompt-body">
                {{ prompt.promptText }}
              </div>

              <div class="card-actions">
                <button type="button" class="ghost-button" @click="copyPrompt(prompt)">Copy</button>
                <button type="button" class="ghost-button" @click="duplicatePrompt(prompt)">Duplicate</button>
                <button v-if="view !== 'trash'" type="button" class="ghost-button" @click="startEdit(prompt)">Edit</button>
                <button
                  v-if="view !== 'trash'"
                  type="button"
                  class="ghost-button"
                  @click="toggleArchive(prompt)"
                >
                  {{ prompt.archived ? "Unarchive" : "Archive" }}
                </button>
                <button v-if="view !== 'trash'" type="button" class="ghost-button" @click="moveToTrash(prompt)">
                  Trash
                </button>
                <button v-else-if="view === 'trash'" type="button" class="ghost-button" @click="restorePrompt(prompt)">
                  Restore
                </button>
                <button v-else type="button" class="danger-button" @click="permanentDelete(prompt)">
                  Delete forever
                </button>
              </div>

              <div class="card-footer">
                <span class="status-pill" :class="{ archived: prompt.archived, favorite: prompt.favorite }">
                  {{ prompt.archived ? "Archived" : "Active" }}
                </span>
                <span class="timestamp">{{ formatDate(prompt.updatedAt) }}</span>
              </div>
            </article>
          </div>
        </main>
      </section>
    </section>
  </div>
</template>

<script>
const API_BASE = "https://promptv.onrender.com/api";

const COLORS = {
  indigo: "#6366f1",
  sky: "#0ea5e9",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  violet: "#8b5cf6",
};

export default {
  name: "App",
  data() {
    return {
      token: localStorage.getItem("pv_token") || "",
      user: JSON.parse(localStorage.getItem("pv_user") || "null"),
      theme: localStorage.getItem("pv_theme") || "dark",

      authMode: "login",
      authBusy: false,
      name: "",
      email: "",
      password: "",

      view: "active",
      search: "",
      categoryFilter: "all",
      favoriteFilter: "all",
      sortBy: "newest",

      prompts: [],
      stats: {
        total: 0,
        active: 0,
        archived: 0,
        trash: 0,
        favorites: 0,
        categories: 0,
        categoryBreakdown: [],
        recentPrompts: [],
      },
      loadingPrompts: false,
      loadingStats: false,

      editingId: null,
      savingPrompt: false,
      title: "",
      category: "General",
      tagsInput: "",
      favorite: false,
      notes: "",
      promptText: "",
      color: "indigo",

      toasts: [],
      searchTimer: null,
    };
  },

  computed: {
    isLoggedIn() {
      return Boolean(this.token && this.user);
    },

    categoryOptions() {
      const list = (this.stats.categoryBreakdown || []).map((item) => item._id).filter(Boolean);
      return [...new Set(list)];
    },

    statCards() {
      return [
        { label: "Total", value: this.stats.total },
        { label: "Active", value: this.stats.active },
        { label: "Favorites", value: this.stats.favorites },
        { label: "Archived", value: this.stats.archived },
        { label: "Trash", value: this.stats.trash },
        { label: "Categories", value: this.stats.categories },
      ];
    },

    tabs() {
      return [
        { label: "Active", value: "active", count: this.stats.active },
        { label: "All", value: "all", count: this.stats.total },
        { label: "Archived", value: "archived", count: this.stats.archived },
        { label: "Trash", value: "trash", count: this.stats.trash },
      ];
    },

    currentViewLabel() {
      const labels = {
        active: "Active prompts",
        all: "All prompts",
        archived: "Archived prompts",
        trash: "Trash",
      };
      return labels[this.view] || "Prompts";
    },
  },

  watch: {
    theme(value) {
      localStorage.setItem("pv_theme", value);
    },

    view() {
      this.loadPrompts();
    },

    sortBy() {
      this.loadPrompts();
    },

    categoryFilter() {
      this.loadPrompts();
    },

    favoriteFilter() {
      this.loadPrompts();
    },

    search() {
      clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => {
        this.loadPrompts();
      }, 300);
    },
  },

  mounted() {
    this.bootstrap();
  },

  methods: {
    accentColor(key) {
      return COLORS[key] || COLORS.indigo;
    },

    async request(path, options = {}) {
      const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };

      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || "Request failed");
      }

      return data;
    },

    notify(message, type = "info") {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.toasts.push({ id, message, type });

      setTimeout(() => {
        this.toasts = this.toasts.filter((toast) => toast.id !== id);
      }, 2800);
    },

    async bootstrap() {
      if (!this.token) {
        return;
      }

      try {
        const me = await this.request("/auth/me");
        this.user = me;
        localStorage.setItem("pv_user", JSON.stringify(me));
        await this.refreshData();
      } catch (error) {
        this.logout(true);
      }
    },

    async refreshData() {
      await Promise.all([this.loadStats(), this.loadPrompts()]);
    },

    async loadStats() {
      this.loadingStats = true;
      try {
        this.stats = await this.request("/prompts/stats");
      } catch (error) {
        this.notify(error.message, "error");
      } finally {
        this.loadingStats = false;
      }
    },

    async loadPrompts() {
      if (!this.token) return;

      this.loadingPrompts = true;
      try {
        const params = new URLSearchParams({
          view: this.view,
          search: this.search,
          category: this.categoryFilter,
          favorite: this.favoriteFilter,
          sort: this.sortBy,
        });

        this.prompts = await this.request(`/prompts?${params.toString()}`);
      } catch (error) {
        this.notify(error.message, "error");
      } finally {
        this.loadingPrompts = false;
      }
    },

    async submitAuth() {
      this.authBusy = true;

      try {
        const payload = {
          email: this.email,
          password: this.password,
        };

        if (this.authMode === "register") {
          payload.name = this.name;
        }

        const data =
          this.authMode === "register"
            ? await this.request("/auth/register", {
                method: "POST",
                body: JSON.stringify(payload),
              })
            : await this.request("/auth/login", {
                method: "POST",
                body: JSON.stringify(payload),
              });

        this.token = data.token;
        this.user = data.user;

        localStorage.setItem("pv_token", data.token);
        localStorage.setItem("pv_user", JSON.stringify(data.user));

        this.notify(this.authMode === "register" ? "Account created" : "Logged in successfully", "success");

        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      } finally {
        this.authBusy = false;
      }
    },

    logout(silent = false) {
      this.token = "";
      this.user = null;
      this.prompts = [];
      this.stats = {
        total: 0,
        active: 0,
        archived: 0,
        trash: 0,
        favorites: 0,
        categories: 0,
        categoryBreakdown: [],
        recentPrompts: [],
      };

      localStorage.removeItem("pv_token");
      localStorage.removeItem("pv_user");

      if (!silent) {
        this.notify("Logged out", "info");
      }
    },

    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      this.notify(`${this.theme === "dark" ? "Dark" : "Light"} mode enabled`, "info");
    },

    clearFilters() {
      this.view = "active";
      this.search = "";
      this.categoryFilter = "all";
      this.favoriteFilter = "all";
      this.sortBy = "newest";
      this.notify("Filters reset", "info");
    },

    resetForm() {
      this.editingId = null;
      this.title = "";
      this.category = "General";
      this.tagsInput = "";
      this.favorite = false;
      this.notes = "";
      this.promptText = "";
      this.color = "indigo";
    },

    startEdit(prompt) {
      this.editingId = prompt._id;
      this.title = prompt.title || "";
      this.category = prompt.category || "General";
      this.tagsInput = (prompt.tags || []).join(", ");
      this.favorite = Boolean(prompt.favorite);
      this.notes = prompt.notes || "";
      this.promptText = prompt.promptText || "";
      this.color = prompt.color || "indigo";

      window.scrollTo({ top: 0, behavior: "smooth" });
      this.notify("Editing prompt", "info");
    },

    cancelEdit() {
      this.resetForm();
      this.notify("Edit cancelled", "info");
    },

    async savePrompt() {
      if (!this.title.trim() || !this.promptText.trim()) {
        this.notify("Title and prompt text are required", "error");
        return;
      }

      this.savingPrompt = true;

      try {
        const payload = {
          title: this.title,
          category: this.category,
          tagsInput: this.tagsInput,
          favorite: this.favorite,
          notes: this.notes,
          promptText: this.promptText,
          color: this.color,
        };

        if (this.editingId) {
          await this.request(`/prompts/${this.editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
          this.notify("Prompt updated", "success");
        } else {
          await this.request("/prompts", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          this.notify("Prompt saved", "success");
        }

        this.resetForm();
        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      } finally {
        this.savingPrompt = false;
      }
    },

    async toggleFavorite(prompt) {
      try {
        await this.request(`/prompts/${prompt._id}/favorite`, {
          method: "PATCH",
          body: JSON.stringify({ favorite: !prompt.favorite }),
        });
        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      }
    },

    async toggleArchive(prompt) {
      try {
        await this.request(`/prompts/${prompt._id}/archive`, {
          method: "PATCH",
          body: JSON.stringify({ archived: !prompt.archived }),
        });
        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      }
    },

    async moveToTrash(prompt) {
      try {
        await this.request(`/prompts/${prompt._id}`, {
          method: "DELETE",
        });
        this.notify("Moved to trash", "info");
        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      }
    },

    async restorePrompt(prompt) {
      try {
        await this.request(`/prompts/${prompt._id}/restore`, {
          method: "PATCH",
        });
        this.notify("Prompt restored", "success");
        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      }
    },

    async permanentDelete(prompt) {
      const confirmed = window.confirm("Delete this prompt forever?");
      if (!confirmed) return;

      try {
        await this.request(`/prompts/${prompt._id}/permanent`, {
          method: "DELETE",
        });
        this.notify("Prompt deleted forever", "info");
        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      }
    },

    async duplicatePrompt(prompt) {
      try {
        await this.request(`/prompts/${prompt._id}/duplicate`, {
          method: "POST",
        });
        this.notify("Prompt duplicated", "success");
        await this.refreshData();
      } catch (error) {
        this.notify(error.message, "error");
      }
    },

    async copyPrompt(prompt) {
      const tagText = (prompt.tags || []).join(", ");
      const content = [
        prompt.title,
        `Category: ${prompt.category || "General"}`,
        tagText ? `Tags: ${tagText}` : "",
        prompt.notes ? `Notes: ${prompt.notes}` : "",
        "",
        prompt.promptText,
      ]
        .filter(Boolean)
        .join("\n");

      try {
        await navigator.clipboard.writeText(content);
        await this.request(`/prompts/${prompt._id}/use`, {
          method: "PATCH",
        });
        this.notify("Copied to clipboard", "success");
        await this.refreshData();
      } catch (error) {
        this.notify("Clipboard access was blocked by the browser", "error");
      }
    },

    exportPrompts() {
      try {
        const blob = new Blob([JSON.stringify(this.prompts, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `promptvault-${this.view}-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.notify("Prompts exported", "success");
      } catch (error) {
        this.notify("Could not export prompts", "error");
      }
    },

    formatDate(value) {
      if (!value) return "Just now";
      const date = new Date(value);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },

    categoryBarWidth(count) {
      const values = (this.stats.categoryBreakdown || []).map((item) => item.count || 0);
      const max = Math.max(...values, 1);
      const width = Math.max(8, Math.round((count / max) * 100));
      return `${width}%`;
    },
  },
};
</script>

<style>
:root {
  color-scheme: dark;
}

body {
  background: #0b1220;
}

.app-shell {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding: 28px;
  color: #e5eef7;
  transition: background 0.25s ease, color 0.25s ease;
}

.app-shell.dark {
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.15), transparent 28%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 26%),
    linear-gradient(180deg, #07111f, #0b1220 40%, #060b16 100%);
}

.app-shell.light {
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 30%),
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.12), transparent 26%),
    linear-gradient(180deg, #eff6ff, #dbeafe 40%, #f8fafc 100%);
  color: #0f172a;
}

.bg-orb {
  position: fixed;
  inset: auto;
  border-radius: 999px;
  filter: blur(70px);
  opacity: 0.45;
  pointer-events: none;
}

.orb-one {
  width: 320px;
  height: 320px;
  top: -60px;
  left: -60px;
  background: rgba(99, 102, 241, 0.22);
}

.orb-two {
  width: 260px;
  height: 260px;
  bottom: 40px;
  right: -50px;
  background: rgba(14, 165, 233, 0.18);
}

.panel {
  background: rgba(10, 16, 29, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
}

.app-shell.light .panel {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(15, 23, 42, 0.08);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
}

.glass {
  backdrop-filter: blur(20px);
}

.auth-screen {
  min-height: calc(100vh - 56px);
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 28px;
  align-items: stretch;
  max-width: 1280px;
  margin: 0 auto;
}

.auth-hero,
.auth-card {
  padding: 34px;
}

.auth-hero h1 {
  margin: 0;
  font-size: clamp(2.4rem, 6vw, 4.7rem);
  line-height: 0.95;
  letter-spacing: -0.05em;
}

.hero-copy {
  max-width: 64ch;
  color: rgba(229, 238, 247, 0.82);
  font-size: 1.06rem;
  margin: 18px 0 24px;
}

.app-shell.light .hero-copy {
  color: rgba(15, 23, 42, 0.8);
}

.feature-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;
}

.feature-item {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.app-shell.light .feature-item {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.06);
}

.auth-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.auth-switch {
  display: inline-flex;
  gap: 8px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 18px;
  width: fit-content;
  margin-bottom: 20px;
}

.app-shell.light .auth-switch {
  background: rgba(15, 23, 42, 0.05);
}

.auth-switch button,
.tab-button,
.primary-button,
.secondary-button,
.ghost-button,
.danger-button,
.star-button {
  border: 0;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}

.auth-switch button {
  min-width: 110px;
  padding: 12px 16px;
  border-radius: 14px;
  background: transparent;
  color: inherit;
}

.auth-switch button.active {
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  box-shadow: 0 12px 24px rgba(99, 102, 241, 0.24);
}

.auth-form h2 {
  margin: 0 0 18px;
  font-size: 1.7rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-row {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 14px;
}

.field label {
  font-size: 0.92rem;
  color: rgba(229, 238, 247, 0.8);
}

.app-shell.light .field label {
  color: rgba(15, 23, 42, 0.75);
}

.field input,
.field textarea,
.field select {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 14, 27, 0.92);
  color: inherit;
  padding: 14px 15px;
  outline: none;
}

.app-shell.light .field input,
.app-shell.light .field textarea,
.app-shell.light .field select {
  background: rgba(255, 255, 255, 0.96);
  border-color: rgba(15, 23, 42, 0.12);
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  border-color: rgba(99, 102, 241, 0.8);
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12);
}

.checkbox-field {
  justify-content: flex-end;
  padding-bottom: 6px;
}

.checkbox-field label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkbox-field input {
  width: auto;
}

.auth-form,
.prompt-form {
  display: grid;
  gap: 14px;
}

.small-note {
  margin: 10px 0 0;
  opacity: 0.8;
}

.primary-button,
.secondary-button,
.ghost-button,
.danger-button {
  border-radius: 16px;
  padding: 13px 16px;
  color: inherit;
  background: rgba(255, 255, 255, 0.06);
}

.primary-button {
  background: linear-gradient(135deg, #6366f1, #0ea5e9);
  color: white;
  font-weight: 700;
}

.secondary-button {
  background: rgba(255, 255, 255, 0.09);
}

.ghost-button {
  background: rgba(255, 255, 255, 0.06);
}

.danger-button {
  background: rgba(244, 63, 94, 0.18);
  color: #ffd4dd;
}

.primary-button:hover,
.secondary-button:hover,
.ghost-button:hover,
.danger-button:hover,
.tab-button:hover,
.auth-switch button:hover,
.star-button:hover {
  transform: translateY(-1px);
}

.primary-button:disabled,
.ghost-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.dashboard {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  gap: 22px;
}

.topbar {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
}

.topbar h1 {
  margin: 4px 0 4px;
  font-size: clamp(2rem, 4vw, 3rem);
  letter-spacing: -0.05em;
}

.subtitle {
  margin: 0;
  color: rgba(229, 238, 247, 0.75);
}

.app-shell.light .subtitle {
  color: rgba(15, 23, 42, 0.68);
}

.topbar-right {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.72rem;
  color: #7dd3fc;
}

.custom-button{
  background-color: red;
  color: white;
}

.app-shell.light .eyebrow {
  color: #2563eb;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  padding: 20px;
}

.stat-card p {
  margin: 0 0 12px;
  color: rgba(229, 238, 247, 0.72);
}

.app-shell.light .stat-card p {
  color: rgba(15, 23, 42, 0.64);
}

.stat-card strong {
  font-size: 1.9rem;
  letter-spacing: -0.04em;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}

.insight-panel {
  padding: 22px;
}

.recent-list,
.breakdown-list {
  display: grid;
  gap: 12px;
}

.recent-card {
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.app-shell.light .recent-card {
  background: rgba(15, 23, 42, 0.03);
  border-color: rgba(15, 23, 42, 0.06);
}

.recent-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.recent-meta {
  font-size: 0.9rem;
  opacity: 0.75;
}

.breakdown-row {
  display: grid;
  gap: 8px;
  padding: 10px 0;
}

.breakdown-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.bar {
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.app-shell.light .bar {
  background: rgba(15, 23, 42, 0.08);
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #6366f1, #0ea5e9);
}

.mini-empty {
  padding: 18px 0;
  opacity: 0.75;
}

.toolbar {
  padding: 20px;
  display: grid;
  gap: 18px;
}

.tab-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tab-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
}

.tab-button strong {
  min-width: 26px;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.86rem;
}

.tab-button.active {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.28), rgba(14, 165, 233, 0.22));
  box-shadow: inset 0 0 0 1px rgba(125, 211, 252, 0.3);
}

.filters-grid {
  display: grid;
  grid-template-columns: 1.2fr repeat(3, 0.65fr) auto auto;
  gap: 14px;
  align-items: end;
}

.content-grid {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 22px;
  align-items: start;
}

.form-panel,
.list-panel {
  padding: 22px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
  margin-bottom: 18px;
}

.panel-header h2 {
  margin: 6px 0 0;
  font-size: 1.5rem;
}

.badge,
.status-pill,
.chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 0.82rem;
}

.badge {
  padding: 8px 12px;
  background: rgba(99, 102, 241, 0.15);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.22);
}

.app-shell.light .badge {
  color: #1e3a8a;
}

.prompt-grid {
  display: grid;
  gap: 16px;
}

.prompt-card {
  position: relative;
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.prompt-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.18);
}

.app-shell.light .prompt-card {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(15, 23, 42, 0.08);
}

.prompt-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 6px;
  background: var(--accent);
}

.prompt-card-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.prompt-card h3 {
  margin: 0;
  font-size: 1.22rem;
}

.prompt-meta {
  margin: 8px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: rgba(229, 238, 247, 0.72);
  font-size: 0.92rem;
}

.app-shell.light .prompt-meta {
  color: rgba(15, 23, 42, 0.68);
}

.star-button {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #facc15;
  font-size: 1.25rem;
}

.app-shell.light .star-button {
  background: rgba(15, 23, 42, 0.05);
}

.prompt-body {
  margin-top: 14px;
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  white-space: pre-wrap;
  line-height: 1.7;
}

.app-shell.light .prompt-body {
  background: rgba(15, 23, 42, 0.04);
}

.notes-text {
  margin: 14px 0 0;
  color: rgba(229, 238, 247, 0.76);
  font-style: italic;
}

.app-shell.light .notes-text {
  color: rgba(15, 23, 42, 0.7);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.chip {
  padding: 7px 11px;
  background: rgba(99, 102, 241, 0.14);
  color: #dbeafe;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.app-shell.light .chip {
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.09);
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.card-actions button {
  padding: 10px 13px;
  border-radius: 14px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
  font-size: 0.88rem;
  color: rgba(229, 238, 247, 0.7);
}

.app-shell.light .card-footer {
  color: rgba(15, 23, 42, 0.64);
}

.status-pill {
  padding: 6px 10px;
  background: rgba(99, 102, 241, 0.14);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.status-pill.archived {
  background: rgba(251, 191, 36, 0.13);
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.2);
}

.status-pill.favorite {
  background: rgba(244, 63, 94, 0.12);
  color: #fecdd3;
  border-color: rgba(244, 63, 94, 0.18);
}

.empty-state {
  padding: 48px 18px;
  text-align: center;
  color: rgba(229, 238, 247, 0.75);
}

.app-shell.light .empty-state {
  color: rgba(15, 23, 42, 0.66);
}

.toast-stack {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 50;
  display: grid;
  gap: 10px;
  width: min(340px, calc(100vw - 36px));
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 15px;
  border-radius: 16px;
  background: rgba(9, 14, 24, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
}

.app-shell.light .toast {
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  border-color: rgba(15, 23, 42, 0.1);
}

.toast-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #60a5fa;
  flex: 0 0 auto;
}

.toast.success .toast-dot {
  background: #22c55e;
}

.toast.error .toast-dot {
  background: #ef4444;
}

.toast.info .toast-dot {
  background: #38bdf8;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.22s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .insights-grid {
    grid-template-columns: 1fr;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .app-shell {
    padding: 16px;
  }

  .auth-screen {
    grid-template-columns: 1fr;
  }

  .topbar {
    flex-direction: column;
    align-items: start;
  }

  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .feature-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 620px) {
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .tab-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .card-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>