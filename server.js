const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { DatabaseSync } = require("node:sqlite");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const DB_FILE = path.join(DATA_DIR, "notionn.sqlite");
const SESSION_TTL = 1000 * 60 * 60 * 24 * 14;
let database;
let seeding = false;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function slug(text) {
  return String(text || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "page";
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  database = database || new DatabaseSync(DB_FILE);
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      member_ids TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      parent_id TEXT,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      cover TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 0,
      archived INTEGER NOT NULL DEFAULT 0,
      shared INTEGER NOT NULL DEFAULT 0,
      slug TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      properties TEXT NOT NULL,
      blocks TEXT NOT NULL,
      comments TEXT NOT NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_pages_workspace ON pages(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
  `);
  const userCount = database.prepare("SELECT COUNT(*) AS total FROM users").get().total;
  if (!userCount && !seeding) {
    seeding = true;
    const userId = id("usr");
    const workspaceId = id("wsp");
    const homeId = id("pg");
    const tasksId = id("pg");
    const db = {
      users: [{
        id: userId,
        name: "Demo User",
        email: "demo@notionn.local",
        password: hashPassword("demo"),
        createdAt: now()
      }],
      sessions: {},
      workspaces: [{
        id: workspaceId,
        name: "Notionn HQ",
        ownerId: userId,
        memberIds: [userId],
        createdAt: now(),
        updatedAt: now()
      }],
      pages: [{
        id: homeId,
        workspaceId,
        parentId: null,
        title: "Home",
        icon: "house",
        cover: "#dbeafe",
        favorite: true,
        archived: false,
        shared: false,
        slug: "home",
        createdBy: userId,
        createdAt: now(),
        updatedAt: now(),
        properties: { status: "Active", owner: "Demo User", due: "" },
        blocks: [
          block("heading", "Welcome to your Notionn workspace"),
          block("text", "Use slash commands, drag your thinking into blocks, organize nested pages, and switch databases between table, board, and calendar views."),
          block("todo", "Invite teammates and ship the first version"),
          block("callout", "This fullstack clone persists to data/notionn.sqlite and exposes a REST API.")
        ],
        comments: []
      }, {
        id: tasksId,
        workspaceId,
        parentId: homeId,
        title: "Launch Tasks",
        icon: "check-square",
        cover: "#dcfce7",
        favorite: false,
        archived: false,
        shared: false,
        slug: "launch-tasks",
        createdBy: userId,
        createdAt: now(),
        updatedAt: now(),
        properties: { status: "In progress", owner: "Demo User", due: "" },
        blocks: [
          block("database", "Product launch tracker", {
            view: "table",
            columns: ["Task", "Status", "Owner", "Due"],
            rows: [
              { id: id("row"), Task: "Draft landing copy", Status: "Done", Owner: "Ava", Due: "" },
              { id: id("row"), Task: "Design onboarding", Status: "In progress", Owner: "Mira", Due: "" },
              { id: id("row"), Task: "Prep launch checklist", Status: "Backlog", Owner: "Sam", Due: "" }
            ]
          })
        ],
        comments: []
      }]
    };
    try {
      writeDb(db);
    } finally {
      seeding = false;
    }
  }
}

function block(type, text = "", extra = {}) {
  return { id: id("blk"), type, text, checked: false, createdAt: now(), updatedAt: now(), ...extra };
}

function readDb() {
  ensureDb();
  const users = database.prepare("SELECT id, name, email, password, created_at AS createdAt FROM users").all();
  const sessions = Object.fromEntries(database
    .prepare("SELECT id, user_id AS userId, expires_at AS expiresAt FROM sessions")
    .all()
    .map((session) => [session.id, { userId: session.userId, expiresAt: session.expiresAt }]));
  const workspaces = database
    .prepare("SELECT id, name, owner_id AS ownerId, member_ids AS memberIds, created_at AS createdAt, updated_at AS updatedAt FROM workspaces")
    .all()
    .map((workspace) => ({ ...workspace, memberIds: JSON.parse(workspace.memberIds) }));
  const pages = database
    .prepare(`
      SELECT id, workspace_id AS workspaceId, parent_id AS parentId, title, icon, cover, favorite, archived, shared,
             slug, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt, properties, blocks, comments
      FROM pages
    `)
    .all()
    .map((page) => ({
      ...page,
      favorite: Boolean(page.favorite),
      archived: Boolean(page.archived),
      shared: Boolean(page.shared),
      properties: JSON.parse(page.properties),
      blocks: JSON.parse(page.blocks),
      comments: JSON.parse(page.comments)
    }));
  return { users, sessions, workspaces, pages };
}

function writeDb(db) {
  ensureDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    database.exec("DELETE FROM pages; DELETE FROM workspaces; DELETE FROM sessions; DELETE FROM users;");
    const insertUser = database.prepare("INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)");
    const insertSession = database.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)");
    const insertWorkspace = database.prepare("INSERT INTO workspaces (id, name, owner_id, member_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)");
    const insertPage = database.prepare(`
      INSERT INTO pages (
        id, workspace_id, parent_id, title, icon, cover, favorite, archived, shared, slug, created_by,
        created_at, updated_at, properties, blocks, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const user of db.users) {
      insertUser.run(user.id, user.name, user.email, user.password, user.createdAt);
    }
    for (const [sessionId, session] of Object.entries(db.sessions)) {
      insertSession.run(sessionId, session.userId, session.expiresAt);
    }
    for (const workspace of db.workspaces) {
      insertWorkspace.run(workspace.id, workspace.name, workspace.ownerId, JSON.stringify(workspace.memberIds), workspace.createdAt, workspace.updatedAt);
    }
    for (const page of db.pages) {
      insertPage.run(
        page.id,
        page.workspaceId,
        page.parentId,
        page.title,
        page.icon,
        page.cover,
        page.favorite ? 1 : 0,
        page.archived ? 1 : 0,
        page.shared ? 1 : 0,
        page.slug,
        page.createdBy,
        page.createdAt,
        page.updatedAt,
        JSON.stringify(page.properties || {}),
        JSON.stringify(page.blocks || []),
        JSON.stringify(page.comments || [])
      );
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(":");
  const actual = crypto.scryptSync(String(password), salt, 64);
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), actual);
}

function send(res, status, body, headers = {}) {
  const payload = body === null ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  res.end(payload);
}

function fail(res, status, message) {
  send(res, status, { error: message });
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((pair) => {
    const index = pair.indexOf("=");
    return [pair.slice(0, index).trim(), decodeURIComponent(pair.slice(index + 1))];
  }));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function auth(req, db) {
  const sid = parseCookies(req).notionn_sid;
  const session = sid && db.sessions[sid];
  if (!session || new Date(session.expiresAt).getTime() < Date.now()) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

function pageTree(pages, parentId = null) {
  return pages
    .filter((page) => page.parentId === parentId && !page.archived)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((page) => ({ ...pageMeta(page), children: pageTree(pages, page.id) }));
}

function pageMeta(page) {
  return {
    id: page.id,
    workspaceId: page.workspaceId,
    parentId: page.parentId,
    title: page.title,
    icon: page.icon,
    cover: page.cover,
    favorite: page.favorite,
    archived: page.archived,
    shared: page.shared,
    slug: page.slug,
    updatedAt: page.updatedAt,
    properties: page.properties
  };
}

function cloneBlockIds(blocks) {
  return (blocks || []).map((item) => {
    const clone = { ...item, id: id("blk"), createdAt: now(), updatedAt: now() };
    if (Array.isArray(clone.rows)) {
      clone.rows = clone.rows.map((row) => ({ ...row, id: id("row") }));
    }
    return clone;
  });
}

function duplicatePage(page, user) {
  const title = `${page.title} Copy`;
  return {
    ...page,
    id: id("pg"),
    title,
    slug: slug(title),
    favorite: false,
    archived: false,
    shared: false,
    createdBy: user.id,
    createdAt: now(),
    updatedAt: now(),
    blocks: cloneBlockIds(page.blocks),
    comments: []
  };
}

function pageMarkdown(page) {
  const lines = [`# ${page.title}`, ""];
  for (const block of page.blocks || []) {
    if (block.type === "heading") lines.push(`## ${block.text || ""}`);
    else if (block.type === "todo") lines.push(`- [${block.checked ? "x" : " "}] ${block.text || ""}`);
    else if (block.type === "quote") lines.push(`> ${block.text || ""}`);
    else if (block.type === "callout") lines.push(`> Note: ${block.text || ""}`);
    else if (block.type === "code") lines.push("```", block.text || "", "```");
    else if (block.type === "database") {
      const columns = block.columns || [];
      lines.push(`## ${block.text || "Database"}`);
      if (columns.length) {
        lines.push(`| ${columns.join(" | ")} |`);
        lines.push(`| ${columns.map(() => "---").join(" | ")} |`);
        for (const row of block.rows || []) {
          lines.push(`| ${columns.map((column) => String(row[column] || "").replace(/\|/g, "\\|")).join(" | ")} |`);
        }
      }
    } else {
      lines.push(block.text || "");
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd() + "\n";
}

function workspaceFor(user, db) {
  return db.workspaces.find((workspace) => workspace.memberIds.includes(user.id));
}

async function api(req, res, pathname) {
  const db = readDb();
  const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};

  if (pathname === "/api/health" && req.method === "GET") {
    return send(res, 200, {
      ok: true,
      service: "notionn",
      database: path.basename(DB_FILE),
      time: now()
    });
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim() || email.split("@")[0] || "User";
    if (!email || !body.password) return fail(res, 400, "Email and password are required.");
    if (db.users.some((user) => user.email === email)) return fail(res, 409, "That email is already registered.");
    const user = { id: id("usr"), name, email, password: hashPassword(body.password), createdAt: now() };
    const workspace = { id: id("wsp"), name: `${name}'s Workspace`, ownerId: user.id, memberIds: [user.id], createdAt: now(), updatedAt: now() };
    const page = {
      id: id("pg"), workspaceId: workspace.id, parentId: null, title: "Home", icon: "house", cover: "#fef3c7",
      favorite: true, archived: false, shared: false, slug: "home", createdBy: user.id, createdAt: now(), updatedAt: now(),
      properties: { status: "Active", owner: name, due: "" },
      blocks: [block("heading", "Untitled ideas, captured beautifully"), block("text", "Start typing, add a database, or create nested pages from the sidebar.")],
      comments: []
    };
    db.users.push(user);
    db.workspaces.push(workspace);
    db.pages.push(page);
    return createSession(res, db, user);
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const user = db.users.find((candidate) => candidate.email === email);
    if (!user || !verifyPassword(body.password || "", user.password)) return fail(res, 401, "Invalid email or password.");
    return createSession(res, db, user);
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const sid = parseCookies(req).notionn_sid;
    if (sid) delete db.sessions[sid];
    writeDb(db);
    return send(res, 204, null, { "set-cookie": "notionn_sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
  }

  const user = auth(req, db);
  if (!user) return fail(res, 401, "Authentication required.");
  const workspace = workspaceFor(user, db);
  if (!workspace) return fail(res, 404, "Workspace not found.");
  const pages = db.pages.filter((page) => page.workspaceId === workspace.id);

  if (pathname === "/api/me" && req.method === "GET") {
    return send(res, 200, { user: publicUser(user), workspace, tree: pageTree(pages), pages: pages.map(pageMeta) });
  }

  if (pathname === "/api/pages" && req.method === "POST") {
    const title = String(body.title || "Untitled").trim() || "Untitled";
    const page = {
      id: id("pg"), workspaceId: workspace.id, parentId: body.parentId || null, title, icon: body.icon || "file-text",
      cover: body.cover || "#e5e7eb", favorite: false, archived: false, shared: false, slug: slug(title),
      createdBy: user.id, createdAt: now(), updatedAt: now(), properties: { status: "Draft", owner: user.name, due: "" },
      blocks: body.template === "meeting" ? meetingTemplate() : body.template === "project" ? projectTemplate() : [block("text", "")],
      comments: []
    };
    db.pages.push(page);
    writeDb(db);
    return send(res, 201, { page, tree: pageTree(db.pages.filter((candidate) => candidate.workspaceId === workspace.id)) });
  }

  if (pathname === "/api/search" && req.method === "GET") {
    const q = String(new URL(req.url, `http://${req.headers.host}`).searchParams.get("q") || "").toLowerCase();
    const results = pages.filter((page) => {
      const haystack = `${page.title} ${page.blocks.map((item) => item.text).join(" ")}`.toLowerCase();
      return !page.archived && haystack.includes(q);
    }).slice(0, 30).map(pageMeta);
    return send(res, 200, { results });
  }

  const duplicateMatch = pathname.match(/^\/api\/pages\/([^/]+)\/duplicate$/);
  if (duplicateMatch && req.method === "POST") {
    const page = pages.find((candidate) => candidate.id === duplicateMatch[1]);
    if (!page) return fail(res, 404, "Page not found.");
    const copy = duplicatePage(page, user);
    db.pages.push(copy);
    writeDb(db);
    return send(res, 201, { page: copy, tree: pageTree(db.pages.filter((candidate) => candidate.workspaceId === workspace.id)) });
  }

  const exportMatch = pathname.match(/^\/api\/pages\/([^/]+)\/export$/);
  if (exportMatch && req.method === "GET") {
    const page = pages.find((candidate) => candidate.id === exportMatch[1]);
    if (!page) return fail(res, 404, "Page not found.");
    return send(res, 200, { filename: `${page.slug || slug(page.title)}.md`, markdown: pageMarkdown(page) });
  }

  const permanentDeleteMatch = pathname.match(/^\/api\/pages\/([^/]+)\/permanent$/);
  if (permanentDeleteMatch && req.method === "DELETE") {
    const pageIndex = db.pages.findIndex((candidate) => candidate.id === permanentDeleteMatch[1] && candidate.workspaceId === workspace.id);
    if (pageIndex === -1) return fail(res, 404, "Page not found.");
    const [page] = db.pages.splice(pageIndex, 1);
    for (const child of db.pages.filter((candidate) => candidate.parentId === page.id)) {
      child.parentId = null;
      child.updatedAt = now();
    }
    writeDb(db);
    return send(res, 200, { page, tree: pageTree(db.pages.filter((candidate) => candidate.workspaceId === workspace.id)) });
  }

  const pageMatch = pathname.match(/^\/api\/pages\/([^/]+)$/);
  if (pageMatch) {
    const page = pages.find((candidate) => candidate.id === pageMatch[1]);
    if (!page) return fail(res, 404, "Page not found.");
    if (req.method === "GET") return send(res, 200, { page });
    if (req.method === "PATCH") {
      Object.assign(page, pick(body, ["title", "icon", "cover", "favorite", "archived", "shared", "parentId", "properties", "blocks"]));
      if (body.title) page.slug = slug(body.title);
      page.updatedAt = now();
      writeDb(db);
      return send(res, 200, { page, tree: pageTree(db.pages.filter((candidate) => candidate.workspaceId === workspace.id)) });
    }
    if (req.method === "DELETE") {
      page.archived = true;
      page.updatedAt = now();
      writeDb(db);
      return send(res, 200, { page, tree: pageTree(db.pages.filter((candidate) => candidate.workspaceId === workspace.id)) });
    }
  }

  const commentMatch = pathname.match(/^\/api\/pages\/([^/]+)\/comments$/);
  if (commentMatch && req.method === "POST") {
    const page = pages.find((candidate) => candidate.id === commentMatch[1]);
    if (!page) return fail(res, 404, "Page not found.");
    const comment = { id: id("cmt"), authorId: user.id, author: user.name, text: String(body.text || "").trim(), createdAt: now() };
    if (!comment.text) return fail(res, 400, "Comment text is required.");
    page.comments.push(comment);
    page.updatedAt = now();
    writeDb(db);
    return send(res, 201, { comment, page });
  }

  const workspaceMatch = pathname.match(/^\/api\/workspace\/([^/]+)$/);
  if (workspaceMatch && workspaceMatch[1] === workspace.id && req.method === "PATCH") {
    Object.assign(workspace, pick(body, ["name"]));
    workspace.updatedAt = now();
    writeDb(db);
    return send(res, 200, { workspace });
  }

  fail(res, 404, "Route not found.");
}

function pick(source, keys) {
  return Object.fromEntries(keys.filter((key) => Object.prototype.hasOwnProperty.call(source, key)).map((key) => [key, source[key]]));
}

function meetingTemplate() {
  return [
    block("heading", "Meeting notes"),
    block("text", "Date, attendees, and context"),
    block("todo", "Action item"),
    block("heading", "Decisions"),
    block("text", "")
  ];
}

function projectTemplate() {
  return [
    block("heading", "Project brief"),
    block("callout", "Define the problem, customer, and success metric."),
    block("database", "Milestones", {
      view: "board",
      columns: ["Task", "Status", "Owner", "Due"],
      rows: [
        { id: id("row"), Task: "Discovery", Status: "Backlog", Owner: "", Due: "" },
        { id: id("row"), Task: "Prototype", Status: "In progress", Owner: "", Due: "" }
      ]
    })
  ];
}

function createSession(res, db, user) {
  const sid = id("ses");
  db.sessions[sid] = { userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL).toISOString() };
  writeDb(db);
  send(res, 200, { user: publicUser(user) }, {
    "set-cookie": `notionn_sid=${encodeURIComponent(sid)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${Math.floor(SESSION_TTL / 1000)}`
  });
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) {
          res.writeHead(404);
          return res.end("Not found");
        }
        res.writeHead(200, { "content-type": types[".html"] });
        res.end(fallback);
      });
      return;
    }
    res.writeHead(200, { "content-type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

ensureDb();

function listen(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith("/api/")) {
      api(req, res, url.pathname).catch((error) => fail(res, 500, error.message));
    } else {
      serveStatic(req, res, url.pathname);
    }
  });
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < PORT + 20) {
      const nextPort = port + 1;
      console.log(`Port ${port} is busy, trying ${nextPort}...`);
      listen(nextPort);
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`Notionn is running at http://localhost:${port}`);
    console.log("Demo login: demo@notionn.local / demo");
  });
}

listen(PORT);
