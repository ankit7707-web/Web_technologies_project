const icons = {
  house: '<path d="m3 10 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  "file-text": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  star: '<path d="m12 2 3.1 6.4 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21.1 7 14.3 2 9.4l6.9-1z"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  table: '<path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>',
  columns: '<path d="M12 3v18"/><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><path d="M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  "check-square": '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
};

const app = document.querySelector("#app");
const state = {
  user: null,
  workspace: null,
  tree: [],
  pages: [],
  current: null,
  sidebarOpen: false,
  saveTimer: null,
  saveState: "saved",
  pendingFocusBlock: null
};

const blockTypes = [
  ["text", "Text", "Plain paragraph"],
  ["heading", "Heading", "Section title"],
  ["todo", "To-do", "Checkbox task"],
  ["quote", "Quote", "Inset quote"],
  ["callout", "Callout", "Highlighted note"],
  ["code", "Code", "Code block"],
  ["database", "Database", "Table, board, calendar"]
];

const coverColors = ["#dbeafe", "#dcfce7", "#fef3c7", "#fee2e2", "#ede9fe", "#e0f2fe", "#f5f5f4"];

function svg(name) {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons["file-text"]}</svg>`;
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    credentials: "same-origin",
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

async function boot() {
  try {
    const data = await request("/api/me");
    Object.assign(state, data);
    const first = state.pages.find((page) => page.favorite) || state.pages[0];
    if (first) await openPage(first.id);
    render();
  } catch {
    renderLanding();
  }
}

function renderLanding() {
  app.innerHTML = `
    <main class="landing">
      <nav class="landing-nav">
        <div class="brand-lockup">
          <div class="brand-mark">N</div>
          <div><strong>Notionn</strong><span>Workspace OS</span></div>
        </div>
        <div class="landing-actions">
          <button class="ghost" id="landing-login">Login</button>
          <button class="primary" id="landing-register">Get started</button>
        </div>
      </nav>
      <section class="landing-hero">
        <div class="hero-copy">
          <p class="eyebrow">All-in-one workspace</p>
          <h1>Notionn</h1>
          <p class="hero-lede">A beautiful home for notes, project docs, task boards, calendars, comments, and lightweight databases powered by a real backend.</p>
          <div class="hero-actions">
            <button class="primary" id="hero-register">${svg("plus")} Start free</button>
            <button class="ghost" id="hero-login">Use demo login</button>
          </div>
          <div class="hero-proof">
            <span><strong>SQLite</strong> database</span>
            <span><strong>REST</strong> backend</span>
            <span><strong>Live</strong> autosave</span>
          </div>
        </div>
        <div class="hero-product" aria-hidden="true">
          <div class="hero-image-frame">
            <img src="/assets/landing-hero.png" alt="">
            <div class="floating-card card-top"><strong>24</strong><span>Pages organized</span></div>
            <div class="floating-card card-bottom"><strong>Board</strong><span>Table, calendar, tasks</span></div>
          </div>
        </div>
      </section>
      <section class="landing-strip" aria-label="Highlights">
        <article><strong>Nested pages</strong><span>Organize docs and projects into a clean workspace tree.</span></article>
        <article><strong>Database views</strong><span>Switch work between table, board, and calendar layouts.</span></article>
        <article><strong>Persistent backend</strong><span>Node API with SQLite storage for users, pages, and comments.</span></article>
      </section>
      <section class="landing-showcase" aria-label="Product features">
        <div>
          <span>${svg("file-text")}</span>
          <strong>Write naturally</strong>
          <p>Capture ideas with rich blocks, to-dos, callouts, quotes, and code.</p>
        </div>
        <div>
          <span>${svg("columns")}</span>
          <strong>Plan visually</strong>
          <p>Turn project work into editable databases with board and calendar modes.</p>
        </div>
        <div>
          <span>${svg("share")}</span>
          <strong>Collaborate clearly</strong>
          <p>Share pages, comment on work, restore archived content, and export Markdown.</p>
        </div>
      </section>
    </main>`;
  document.querySelector("#landing-login").onclick = () => renderAuth("login");
  document.querySelector("#hero-login").onclick = () => renderAuth("login");
  document.querySelector("#landing-register").onclick = () => renderAuth("register");
  document.querySelector("#hero-register").onclick = () => renderAuth("register");
}

function renderAuth(mode = "login") {
  app.innerHTML = `
    <main class="auth">
      <section class="auth-panel" aria-label="${mode === "login" ? "Login" : "Create account"}">
        <div class="brand-lockup">
          <div class="brand-mark">N</div>
          <div><strong>Notionn</strong><span>Workspace OS</span></div>
        </div>
        <div class="auth-card">
          <div class="auth-tabs">
            <button class="${mode === "login" ? "active" : ""}" id="login-tab" type="button">Login</button>
            <button class="${mode === "register" ? "active" : ""}" id="register-tab" type="button">Register</button>
          </div>
          <h1>${mode === "login" ? "Welcome back" : "Create workspace"}</h1>
          <p>${mode === "login" ? "Sign in to continue building your notes, tasks, and team docs." : "Start with pages, databases, comments, and search."}</p>
          <form id="auth-form">
            <label class="${mode === "login" ? "hidden" : ""}">Name<input name="name" placeholder="Alex Morgan" autocomplete="name"></label>
            <label>Email<input name="email" placeholder="you@example.com" autocomplete="email" value="${mode === "login" ? "demo@notionn.local" : ""}"></label>
            <label>Password<input name="password" placeholder="Enter password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" value="${mode === "login" ? "demo" : ""}"></label>
            <button class="primary auth-submit">${mode === "login" ? "Login to workspace" : "Create workspace"}</button>
            <div class="demo-credentials">
              <span>Demo</span>
              <code>demo@notionn.local</code>
              <code>demo</code>
            </div>
            <button type="button" class="text-link" id="switch-auth">${mode === "login" ? "Need an account? Register" : "Already have an account? Login"}</button>
            <div class="error" id="auth-error"></div>
          </form>
        </div>
      </section>
      <section class="auth-art" aria-hidden="true">
        <div class="preview-shell">
          <div class="preview-sidebar">
            <div></div><div></div><div></div><div></div>
          </div>
          <div class="preview-doc">
            <div class="preview-cover"></div>
            <div class="preview-title"></div>
            <div class="preview-props"><span></span><span></span><span></span></div>
            <div class="preview-block wide"></div>
            <div class="preview-block"></div>
            <div class="preview-grid">
              <div><strong></strong><span></span><span></span></div>
              <div><strong></strong><span></span><span></span></div>
              <div><strong></strong><span></span><span></span></div>
            </div>
          </div>
        </div>
        <div class="auth-note">
          <strong>Build from one place</strong>
          <span>Docs, task boards, calendars, and comments backed by SQLite.</span>
        </div>
      </section>
    </main>`;
  document.querySelector("#login-tab").onclick = () => renderAuth("login");
  document.querySelector("#register-tab").onclick = () => renderAuth("register");
  document.querySelector("#switch-auth").onclick = () => renderAuth(mode === "login" ? "register" : "login");
  document.querySelector("#auth-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await request(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", body: form });
      await boot();
    } catch (error) {
      document.querySelector("#auth-error").textContent = error.message;
    }
  };
}

function render() {
  if (!state.user) return renderAuth();
  app.innerHTML = `
    <div class="shell">
      ${sidebar()}
      <main class="editor">
        ${topbar()}
        <section class="page">${state.current ? pageView() : emptyView()}</section>
      </main>
      ${inspector()}
    </div>
    <div id="modal-root"></div>
    <div id="slash-root"></div>
    <div id="toast" class="toast hidden"></div>`;
  bind();
}

function sidebar() {
  return `
    <aside class="sidebar ${state.sidebarOpen ? "open" : ""}">
      <div class="workspace-switch">
        <div class="avatar">${state.user.name.slice(0, 1).toUpperCase()}</div>
        <div class="workspace-meta"><strong>${escapeHtml(state.workspace.name)}</strong><span>${escapeHtml(state.user.email)}</span></div>
        <button class="icon-btn" data-action="logout" title="Log out">${svg("logout")}</button>
      </div>
      <div class="side-actions">
        <button class="ghost" data-action="new-page">${svg("plus")} New page</button>
        <button class="ghost" data-action="new-project">${svg("columns")} Project template</button>
        <button class="ghost" data-action="new-meeting">${svg("file-text")} Meeting notes</button>
      </div>
      <div class="side-section-title">Favorites</div>
      <div>${state.pages.filter((page) => page.favorite && !page.archived).map((page) => pageButton(page, 0)).join("") || `<div class="page-row">No favorites</div>`}</div>
      <div class="side-section-title">Pages</div>
      <div class="tree">${treeHtml(state.tree)}</div>
      <div class="side-section-title">Trash</div>
      <div class="trash-list">${state.pages.filter((page) => page.archived).map(trashButton).join("") || `<div class="page-row muted-row">Trash is empty</div>`}</div>
    </aside>`;
}

function treeHtml(nodes, depth = 0) {
  return nodes.map((node) => `${pageButton(node, depth)}${treeHtml(node.children || [], depth + 1)}`).join("");
}

function pageButton(page, depth) {
  return `<button class="page-row indent ${state.current?.id === page.id ? "active" : ""}" style="--depth:${depth}" data-page="${page.id}">${svg(page.icon)}<span>${escapeHtml(page.title)}</span></button>`;
}

function trashButton(page) {
  return `<div class="trash-row"><button class="page-row ${state.current?.id === page.id ? "active" : ""}" data-page="${page.id}">${svg(page.icon)}<span>${escapeHtml(page.title)}</span></button><button class="icon-btn" data-restore-page="${page.id}" title="Restore">${svg("rotate")}</button></div>`;
}

function topbar() {
  const saveLabel = state.saveState === "saving" ? "Saving..." : state.saveState === "error" ? "Offline changes" : "Saved";
  const pageActions = state.current ? `
      <button class="ghost" data-action="share">${svg("share")} ${state.current.shared ? "Shared" : "Share"}</button>
      <button class="icon-btn" data-action="duplicate" title="Duplicate">${svg("copy")}</button>
      <button class="icon-btn" data-action="export" title="Export Markdown">${svg("download")}</button>
      <button class="icon-btn" data-action="favorite" title="Favorite">${svg("star")}</button>
      ${state.current.archived ? `<button class="ghost" data-action="restore">${svg("rotate")} Restore</button><button class="icon-btn danger" data-action="delete-forever" title="Delete forever">${svg("trash")}</button>` : `<button class="icon-btn" data-action="archive" title="Archive">${svg("trash")}</button>`}` : `
      <button class="ghost" data-action="new-page">${svg("plus")} New page</button>`;
  return `
    <header class="topbar">
      <button class="icon-btn" data-action="toggle-sidebar" title="Menu">${svg("menu")}</button>
      <div class="search-wrap">
        <input id="search" placeholder="Search pages and blocks">
        <div class="search-results hidden" id="search-results"></div>
      </div>
      <span class="save-status ${state.saveState}">${saveLabel}</span>
      ${pageActions}
    </header>`;
}

function pageView() {
  const page = state.current;
  return `
    <div class="cover" style="background:${escapeAttr(page.cover)}"></div>
    <div class="cover-tools">${coverColors.map((color) => `<button class="swatch ${page.cover === color ? "active" : ""}" style="background:${color}" data-cover="${color}" title="Set cover color"></button>`).join("")}</div>
    <div class="title-line">
      <button class="page-icon" data-action="cycle-icon" title="Change icon">${svg(page.icon)}</button>
      <input class="title" value="${escapeAttr(page.title)}" data-title>
    </div>
    <div class="property-grid">
      ${propertyInput("status", "Status")}
      ${propertyInput("owner", "Owner")}
      ${propertyInput("due", "Due")}
    </div>
    <div class="blocks" id="blocks">${page.blocks.map(blockHtml).join("")}</div>
    <button class="ghost" data-action="add-block">${svg("plus")} Add block</button>`;
}

function propertyInput(key, label) {
  return `<div class="property"><label>${label}</label><input data-property="${key}" value="${escapeAttr(state.current.properties?.[key] || "")}"></div>`;
}

function blockHtml(block) {
  if (block.type === "database") return `<article class="block" data-type="database" data-block="${block.id}"><div class="handle">${svg("grip")}</div><div>${databaseHtml(block)}</div><button class="icon-btn" data-delete-block="${block.id}">${svg("x")}</button></article>`;
  if (block.type === "todo") {
    return `<article class="block" data-type="todo" data-block="${block.id}"><div class="handle">${svg("grip")}</div><div class="todo-line"><input type="checkbox" data-check="${block.id}" ${block.checked ? "checked" : ""}><div class="block-content" contenteditable="true">${escapeHtml(block.text)}</div></div><button class="icon-btn" data-delete-block="${block.id}">${svg("x")}</button></article>`;
  }
  return `<article class="block" data-type="${block.type}" data-block="${block.id}"><div class="handle">${svg("grip")}</div><div class="block-content" contenteditable="true">${escapeHtml(block.text)}</div><button class="icon-btn" data-delete-block="${block.id}">${svg("x")}</button></article>`;
}

function databaseHtml(block) {
  const statuses = ["Backlog", "In progress", "Done"];
  const rows = block.rows || [];
  const columns = block.columns || ["Task", "Status", "Owner", "Due"];
  const view = block.view || "table";
  let body = "";
  if (view === "table") {
    body = `<table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr data-row="${row.id}">${columns.map((column) => `<td contenteditable="true" data-db-cell="${block.id}:${row.id}:${column}">${escapeHtml(row[column] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  } else if (view === "board") {
    body = `<div class="board">${statuses.map((status) => `<section class="lane"><h4>${status}</h4>${rows.filter((row) => (row.Status || "Backlog") === status).map((row) => `<div class="card"><strong>${escapeHtml(row.Task || "Untitled")}</strong><p>${escapeHtml(row.Owner || "")}</p><select data-db-status="${block.id}:${row.id}">${statuses.map((item) => `<option ${item === status ? "selected" : ""}>${item}</option>`).join("")}</select></div>`).join("")}</section>`).join("")}</div>`;
  } else {
    const days = Array.from({ length: 28 }, (_, index) => index + 1);
    body = `<div class="calendar">${days.map((day) => `<div class="day"><strong>${day}</strong>${rows.filter((row) => Number(String(row.Due || "").split("-").pop()) === day).map((row) => `<div>${escapeHtml(row.Task || "Untitled")}</div>`).join("")}</div>`).join("")}</div>`;
  }
  return `<div class="database"><div class="db-head"><strong contenteditable="true" data-db-title="${block.id}">${escapeHtml(block.text || "Database")}</strong><div class="segmented">${["table", "board", "calendar"].map((name) => `<button class="${view === name ? "active" : ""}" data-db-view="${block.id}:${name}">${svg(name === "board" ? "columns" : name)} ${name}</button>`).join("")}</div><button class="ghost" data-db-add="${block.id}">${svg("plus")}</button></div>${body}</div>`;
}

function inspector() {
  const page = state.current;
  const blocks = page?.blocks || [];
  return `
    <aside class="inspector">
      <h3>Workspace</h3>
      <div class="stat-grid">
        <div class="stat"><strong>${state.pages.filter((page) => !page.archived).length}</strong><span>Pages</span></div>
        <div class="stat"><strong>${state.pages.filter((page) => page.favorite).length}</strong><span>Favorites</span></div>
      </div>
      <h3>Page</h3>
      ${page ? `<div class="stat-grid"><div class="stat"><strong>${blocks.length}</strong><span>Blocks</span></div><div class="stat"><strong>${page.comments.length}</strong><span>Comments</span></div></div><p><strong>Updated</strong><br>${new Date(page.updatedAt).toLocaleString()}</p>` : ""}
      <h3>Comments</h3>
      <div>${(page?.comments || []).map((comment) => `<div class="comment"><strong>${escapeHtml(comment.author)}</strong><span>${new Date(comment.createdAt).toLocaleString()}</span><p>${escapeHtml(comment.text)}</p></div>`).join("")}</div>
      ${page ? `<form class="comment-box" id="comment-form"><textarea placeholder="Add a comment"></textarea><button class="primary">${svg("plus")} Comment</button></form>` : ""}
    </aside>`;
}

function emptyView() {
  return `<div class="empty-state"><h1>No page selected</h1><p>Create a new page to begin.</p><button class="primary" data-action="new-page">${svg("plus")} New page</button></div>`;
}

function bind() {
  document.querySelectorAll("[data-page]").forEach((button) => button.onclick = () => openPage(button.dataset.page));
  document.querySelector("[data-action='toggle-sidebar']").onclick = () => { state.sidebarOpen = !state.sidebarOpen; render(); };
  document.querySelector("[data-action='logout']").onclick = logout;
  document.querySelectorAll("[data-action='new-page']").forEach((button) => button.onclick = () => showNewPage());
  document.querySelector("[data-action='new-project']").onclick = () => createPage({ title: "Project Brief", template: "project" });
  document.querySelector("[data-action='new-meeting']").onclick = () => createPage({ title: "Meeting Notes", template: "meeting" });
  const addBlockButton = document.querySelector("[data-action='add-block']");
  if (addBlockButton) addBlockButton.onclick = () => showBlockMenu(addBlockButton);
  const favoriteButton = document.querySelector("[data-action='favorite']");
  if (favoriteButton) favoriteButton.onclick = () => state.current && updatePage({ favorite: !state.current.favorite }, "Favorite updated");
  const shareButton = document.querySelector("[data-action='share']");
  if (shareButton) shareButton.onclick = () => state.current && updatePage({ shared: !state.current.shared }, state.current.shared ? "Sharing disabled" : "Share link enabled");
  const duplicateButton = document.querySelector("[data-action='duplicate']");
  if (duplicateButton) duplicateButton.onclick = duplicatePage;
  const exportButton = document.querySelector("[data-action='export']");
  if (exportButton) exportButton.onclick = exportPage;
  const archiveButton = document.querySelector("[data-action='archive']");
  if (archiveButton) archiveButton.onclick = archivePage;
  const restoreButton = document.querySelector("[data-action='restore']");
  if (restoreButton) restoreButton.onclick = () => restorePage(state.current.id);
  const deleteForeverButton = document.querySelector("[data-action='delete-forever']");
  if (deleteForeverButton) deleteForeverButton.onclick = deleteForever;
  const iconButton = document.querySelector("[data-action='cycle-icon']");
  if (iconButton) iconButton.onclick = cycleIcon;
  document.querySelectorAll("[data-cover]").forEach((button) => button.onclick = () => {
    state.current.cover = button.dataset.cover;
    render();
    scheduleSave();
  });
  document.querySelectorAll("[data-restore-page]").forEach((button) => button.onclick = (event) => {
    event.stopPropagation();
    restorePage(button.dataset.restorePage);
  });
  const title = document.querySelector("[data-title]");
  if (title) title.oninput = () => { state.current.title = title.value; scheduleSave(); };
  document.querySelectorAll("[data-property]").forEach((input) => input.oninput = () => {
    state.current.properties[input.dataset.property] = input.value;
    scheduleSave();
  });
  document.querySelectorAll(".block-content").forEach((node) => {
    node.oninput = () => {
      const block = findBlock(node.closest("[data-block]").dataset.block);
      block.text = node.textContent;
      if (node.textContent.endsWith("/")) showSlash(node);
      scheduleSave();
    };
    node.onkeydown = blockKeydown;
  });
  document.querySelectorAll("[data-check]").forEach((input) => input.onchange = () => {
    findBlock(input.dataset.check).checked = input.checked;
    scheduleSave();
  });
  document.querySelectorAll("[data-delete-block]").forEach((button) => button.onclick = () => {
    state.current.blocks = state.current.blocks.filter((block) => block.id !== button.dataset.deleteBlock);
    render();
    scheduleSave();
  });
  document.querySelectorAll("[data-db-view]").forEach((button) => button.onclick = () => {
    const [blockId, view] = button.dataset.dbView.split(":");
    findBlock(blockId).view = view;
    render();
    scheduleSave();
  });
  document.querySelectorAll("[data-db-add]").forEach((button) => button.onclick = () => {
    const block = findBlock(button.dataset.dbAdd);
    block.rows.push({ id: randomId("row"), Task: "New task", Status: "Backlog", Owner: state.user.name, Due: "" });
    render();
    scheduleSave();
  });
  document.querySelectorAll("[data-db-cell]").forEach((cell) => cell.oninput = () => {
    const [blockId, rowId, column] = cell.dataset.dbCell.split(":");
    findBlock(blockId).rows.find((row) => row.id === rowId)[column] = cell.textContent;
    scheduleSave();
  });
  document.querySelectorAll("[data-db-status]").forEach((select) => select.onchange = () => {
    const [blockId, rowId] = select.dataset.dbStatus.split(":");
    findBlock(blockId).rows.find((row) => row.id === rowId).Status = select.value;
    render();
    scheduleSave();
  });
  document.querySelectorAll("[data-db-title]").forEach((title) => title.oninput = () => {
    findBlock(title.dataset.dbTitle).text = title.textContent;
    scheduleSave();
  });
  const search = document.querySelector("#search");
  search.oninput = debounce(searchPages, 180);
  const commentForm = document.querySelector("#comment-form");
  if (commentForm) commentForm.onsubmit = addComment;
  focusPendingBlock();
}

async function openPage(id) {
  try {
    setSaveState("saved");
    const data = await request(`/api/pages/${id}`);
    state.current = data.page;
    state.sidebarOpen = false;
    render();
  } catch (error) {
    toast(error.message);
  }
}

async function createPage(options = {}) {
  const parentId = state.current && !state.current.archived ? state.current.id : null;
  try {
    const data = await request("/api/pages", { method: "POST", body: { parentId, ...options } });
    state.tree = data.tree;
    state.pages.push(data.page);
    state.current = data.page;
    render();
    toast("Page created");
  } catch (error) {
    toast(error.message);
  }
}

function showNewPage() {
  document.querySelector("#modal-root").innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <h2>New page</h2>
        <form id="new-page-form">
          <input name="title" placeholder="Page title" autofocus>
          <select name="template"><option value="">Blank</option><option value="project">Project</option><option value="meeting">Meeting notes</option></select>
          <button class="primary">${svg("plus")} Create</button>
          <button type="button" class="ghost" data-close>Cancel</button>
        </form>
      </div>
    </div>`;
  document.querySelector("[data-close]").onclick = closeModal;
  document.querySelector("#new-page-form").onsubmit = (event) => {
    event.preventDefault();
    createPage(Object.fromEntries(new FormData(event.currentTarget)));
    closeModal();
  };
}

function closeModal() {
  document.querySelector("#modal-root").innerHTML = "";
}

function addBlock(type) {
  const block = { id: randomId("blk"), type, text: type === "database" ? "Untitled database" : "", checked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (type === "database") Object.assign(block, { view: "table", columns: ["Task", "Status", "Owner", "Due"], rows: [] });
  state.current.blocks.push(block);
  state.pendingFocusBlock = block.id;
  render();
  scheduleSave();
}

function showBlockMenu(anchor) {
  const rect = anchor.getBoundingClientRect();
  document.querySelector("#slash-root").innerHTML = `<div class="slash-menu add-menu" style="left:${Math.min(rect.left, window.innerWidth - 280)}px;top:${rect.bottom + 8}px">${blockTypes.map(([type, label, desc]) => `<button data-add-type="${type}"><strong>${label}</strong><span>${desc}</span></button>`).join("")}</div>`;
  document.querySelectorAll("[data-add-type]").forEach((button) => button.onclick = () => {
    document.querySelector("#slash-root").innerHTML = "";
    addBlock(button.dataset.addType);
  });
}

function blockKeydown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    const blockId = event.currentTarget.closest("[data-block]").dataset.block;
    const index = state.current.blocks.findIndex((block) => block.id === blockId);
    const block = { id: randomId("blk"), type: "text", text: "", checked: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state.current.blocks.splice(index + 1, 0, block);
    state.pendingFocusBlock = block.id;
    render();
    scheduleSave();
  }
}

function showSlash(anchor) {
  const rect = anchor.getBoundingClientRect();
  document.querySelector("#slash-root").innerHTML = `<div class="slash-menu" style="left:${rect.left}px;top:${rect.bottom + 6}px">${blockTypes.map(([type, label, desc]) => `<button data-slash="${type}"><strong>${label}</strong><span>${desc}</span></button>`).join("")}</div>`;
  document.querySelectorAll("[data-slash]").forEach((button) => button.onclick = () => {
    const block = findBlock(anchor.closest("[data-block]").dataset.block);
    block.type = button.dataset.slash;
    block.text = block.type === "database" ? "Untitled database" : block.text.replace(/\/$/, "");
    if (block.type === "database") Object.assign(block, { view: "table", columns: ["Task", "Status", "Owner", "Due"], rows: [] });
    document.querySelector("#slash-root").innerHTML = "";
    state.pendingFocusBlock = block.id;
    render();
    scheduleSave();
  });
}

function focusPendingBlock() {
  if (!state.pendingFocusBlock) return;
  const block = document.querySelector(`[data-block="${state.pendingFocusBlock}"] .block-content`);
  state.pendingFocusBlock = null;
  if (!block) return;
  block.focus();
  const range = document.createRange();
  range.selectNodeContents(block);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

async function updatePage(patch, message, options = {}) {
  const { renderAfter = true } = options;
  const targetId = patch.id || state.current.id;
  delete patch.id;
  try {
    setSaveState("saving");
    const data = await request(`/api/pages/${targetId}`, { method: "PATCH", body: patch });
    state.current = data.page;
    state.tree = data.tree || state.tree;
    state.pages = state.pages.map((page) => page.id === data.page.id ? { ...page, ...data.page } : page);
    setSaveState("saved");
    if (renderAfter) render();
    if (message) toast(message);
    return data;
  } catch (error) {
    setSaveState("error");
    toast(error.message);
    return null;
  }
}

function scheduleSave() {
  clearTimeout(state.saveTimer);
  setSaveState("saving");
  state.saveTimer = setTimeout(async () => {
    try {
      await updatePage({
        title: state.current.title,
        properties: state.current.properties,
        blocks: state.current.blocks,
        icon: state.current.icon,
        cover: state.current.cover
      }, null, { renderAfter: false });
    } catch {}
  }, 500);
}

async function archivePage() {
  if (!state.current) return;
  try {
    const data = await request(`/api/pages/${state.current.id}`, { method: "DELETE" });
    state.tree = data.tree;
    state.pages = state.pages.map((page) => page.id === data.page.id ? data.page : page);
    state.current = state.pages.find((page) => !page.archived) || null;
    render();
    toast("Page archived");
  } catch (error) {
    toast(error.message);
  }
}

async function restorePage(pageId) {
  try {
    const data = await request(`/api/pages/${pageId}`, { method: "PATCH", body: { archived: false } });
    state.tree = data.tree;
    state.pages = state.pages.map((page) => page.id === data.page.id ? { ...page, ...data.page } : page);
    state.current = data.page;
    render();
    toast("Page restored");
  } catch (error) {
    toast(error.message);
  }
}

async function duplicatePage() {
  if (!state.current) return;
  try {
    const data = await request(`/api/pages/${state.current.id}/duplicate`, { method: "POST" });
    state.tree = data.tree;
    state.pages.push(data.page);
    state.current = data.page;
    render();
    toast("Page duplicated");
  } catch (error) {
    toast(error.message);
  }
}

async function exportPage() {
  if (!state.current) return;
  try {
    const data = await request(`/api/pages/${state.current.id}/export`);
    const blob = new Blob([data.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = data.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Markdown exported");
  } catch (error) {
    toast(error.message);
  }
}

async function deleteForever() {
  if (!state.current?.archived) return;
  const deletedId = state.current.id;
  try {
    const data = await request(`/api/pages/${deletedId}/permanent`, { method: "DELETE" });
    state.tree = data.tree;
    state.pages = state.pages.filter((page) => page.id !== deletedId);
    state.current = state.pages.find((page) => !page.archived) || null;
    render();
    toast("Page deleted");
  } catch (error) {
    toast(error.message);
  }
}

async function searchPages(event) {
  const q = event.target.value.trim();
  const box = document.querySelector("#search-results");
  if (!q) {
    box.classList.add("hidden");
    return;
  }
  try {
    const { results } = await request(`/api/search?q=${encodeURIComponent(q)}`);
    box.innerHTML = results.map((page) => `<button data-search-page="${page.id}">${svg(page.icon)} ${escapeHtml(page.title)}</button>`).join("") || `<div class="search-empty">No results</div>`;
    box.classList.remove("hidden");
    document.querySelectorAll("[data-search-page]").forEach((button) => button.onclick = () => openPage(button.dataset.searchPage));
  } catch (error) {
    box.innerHTML = `<div class="search-empty">${escapeHtml(error.message)}</div>`;
    box.classList.remove("hidden");
  }
}

async function addComment(event) {
  event.preventDefault();
  const textarea = event.currentTarget.querySelector("textarea");
  const text = textarea.value.trim();
  if (!text) return;
  try {
    const data = await request(`/api/pages/${state.current.id}/comments`, { method: "POST", body: { text } });
    state.current = data.page;
    render();
    toast("Comment added");
  } catch (error) {
    toast(error.message);
  }
}

async function logout() {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    state.user = null;
    renderLanding();
  }
}

function cycleIcon() {
  const list = ["file-text", "house", "check-square", "table", "calendar"];
  state.current.icon = list[(list.indexOf(state.current.icon) + 1) % list.length];
  render();
  scheduleSave();
}

function setSaveState(value) {
  state.saveState = value;
  const node = document.querySelector(".save-status");
  if (!node) return;
  node.className = `save-status ${value}`;
  node.textContent = value === "saving" ? "Saving..." : value === "error" ? "Offline changes" : "Saved";
}

function findBlock(id) {
  return state.current.blocks.find((block) => block.id === id);
}

function randomId(prefix) {
  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function toast(message) {
  const node = document.querySelector("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.remove("hidden");
  setTimeout(() => node.classList.add("hidden"), 1600);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

boot();
