// Browser-only stand-in for the admin API, used when no backend is configured
// (REACT_APP_BACKEND_URL unset). Mirrors the backend routes the admin panel calls
// and persists everything — including uploaded videos — in IndexedDB.

const CATALOG = [
  { id: "indicator_pro", name: "Techin Momentum Indicator", type: "indicator", amount: 5499, currency: "inr",
    tagline: "The signature multi-timeframe trading indicator, designed by Raj." },
  { id: "course_beginner", name: "Beginner Trader Course", type: "course", amount: 2999, currency: "inr",
    tagline: "Foundations of price action, risk & psychology for new traders." },
  { id: "course_pro", name: "Pro Trader Masterclass", type: "course", amount: 7999, currency: "inr",
    tagline: "Advanced strategies, live setups and the Techin edge for pros." },
];
const PRODUCT_IDS = CATALOG.map((p) => p.id);

export const DEMO_ADMIN = { id: "demo-admin", name: "Raj", email: "admin (preview)", role: "admin", purchases: [] };

// Ready-made customer for trying the buyer side of the site in preview mode.
export const DEMO_STUDENT = { email: "student@techin.demo", password: "Student@123" };
const DEMO_STUDENT_USER = { id: "demo-student", name: "Demo Student", email: DEMO_STUDENT.email, role: "user",
  purchases: ["course_beginner", "course_pro"] };

/* ---------------------------------------------------------------- IndexedDB key/value store */
let dbPromise;
function openDb() {
  dbPromise ||= new Promise((resolve, reject) => {
    const req = indexedDB.open("techin-admin-preview", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function kv(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("kv", mode);
    const req = fn(tx.objectStore("kv"));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}
const kvGet = (k) => kv("readonly", (s) => s.get(k));
const kvSet = (k, v) => kv("readwrite", (s) => s.put(v, k));
const kvDel = (k) => kv("readwrite", (s) => s.delete(k));

async function load(key, seed) {
  const v = await kvGet(key);
  if (v !== undefined) return v;
  await kvSet(key, seed);
  return seed;
}

const now = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const seedUsers = () => [
  { ...DEMO_ADMIN, created_at: now() },
  { id: uid(), name: "Sample Buyer", email: "buyer@example.com", role: "user", purchases: ["course_pro"], created_at: now() },
  { id: uid(), name: "Sample Visitor", email: "visitor@example.com", role: "user", purchases: [], created_at: now() },
];
const seedPayments = (users) => [
  { order_id: "order_SAMPLE0001", user_id: users[1].id, package_id: "course_pro", amount: 7999, currency: "inr",
    status: "completed", payment_status: "paid", created_at: now() },
];

const getAssets = () => load("assets", []);

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getUsers() {
  const users = await load("users", seedUsers());
  if (!users.some((u) => u.id === DEMO_STUDENT_USER.id)) {
    users.push({ ...DEMO_STUDENT_USER, password_hash: await sha256(DEMO_STUDENT.password), created_at: now() });
    await kvSet("users", users);
  }
  return users;
}

// Never expose password hashes to the UI.
const userView = ({ password_hash, ...u }) => u;

async function sessionUser() {
  const id = await kvGet("session");
  const u = id && (await getUsers()).find((x) => x.id === id);
  return u || fail(401, "Not authenticated");
}
async function getPayments() {
  return load("payments", seedPayments(await getUsers()));
}

/* ---------------------------------------------------------------- helpers */
class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.response = { status, data: { detail } };
  }
}
const fail = (status, detail) => { throw new ApiError(status, detail); };

const assetView = (a) => ({ ...a, is_video: a.content_type.startsWith("video/") });
const byPosition = (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at);

async function listFor(pid) {
  return (await getAssets()).filter((a) => a.package_id === pid).sort(byPosition).map(assetView);
}

async function storeFile(file, onUploadProgress) {
  // Simulated progress so the UI behaves like a real upload.
  for (let p = 1; p <= 4; p++) {
    onUploadProgress?.({ loaded: (file.size * p) / 5, total: file.size });
    await new Promise((r) => setTimeout(r, 120));
  }
  const storageId = uid();
  await kvSet(`blob:${storageId}`, file);
  onUploadProgress?.({ loaded: file.size, total: file.size });
  return storageId;
}

const guessType = (file) => {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop().toLowerCase();
  return { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mkv: "video/x-matroska",
    m4v: "video/x-m4v", pdf: "application/pdf", zip: "application/zip" }[ext] || "application/octet-stream";
};

/* ---------------------------------------------------------------- routes */
const routes = [
  ["get", /^\/products$/, async () => CATALOG],

  ["get", /^\/auth\/me$/, async () => userView(await sessionUser())],

  ["post", /^\/auth\/login$/, async (_, { email, password }) => {
    const u = (await getUsers()).find((x) => x.email === (email || "").trim().toLowerCase());
    if (!u || !u.password_hash || u.password_hash !== (await sha256(password || ""))) fail(401, "Invalid email or password");
    await kvSet("session", u.id);
    return userView(u);
  }],

  ["post", /^\/auth\/register$/, async (_, { name, email, password }) => {
    email = (email || "").trim().toLowerCase();
    if (!name || !email.includes("@")) fail(422, "Enter your name and a valid email");
    if ((password || "").length < 6) fail(422, "Password must be at least 6 characters");
    const users = await getUsers();
    if (users.some((x) => x.email === email)) fail(400, "Email already registered");
    const u = { id: uid(), name, email, role: "user", purchases: [], password_hash: await sha256(password), created_at: now() };
    await kvSet("users", [...users, u]);
    await kvSet("session", u.id);
    return userView(u);
  }],

  ["post", /^\/auth\/logout$/, async () => {
    await kvDel("session");
    return { status: "ok" };
  }],

  ["get", /^\/my\/library$/, async () => {
    const u = await sessionUser();
    const owned = u.role === "admin" ? PRODUCT_IDS : u.purchases;
    return Promise.all(CATALOG.filter((p) => owned.includes(p.id)).map(async (p) => ({ product: p, assets: await listFor(p.id) })));
  }],

  ["post", /^\/payments\/checkout$/, async () =>
    fail(503, "Payments aren't available yet: the site's server isn't connected (preview mode).")],

  ["get", /^\/admin\/stats$/, async () => {
    const [assets, users, payments] = await Promise.all([getAssets(), getUsers(), getPayments()]);
    const paid = payments.filter((p) => p.payment_status === "paid");
    const per_product = Object.fromEntries(PRODUCT_IDS.map((pid) => [pid, {
      buyers: users.filter((u) => u.purchases.includes(pid)).length,
      assets: assets.filter((a) => a.package_id === pid).length,
    }]));
    return {
      users: users.length, admins: users.filter((u) => u.role === "admin").length,
      paid_orders: paid.length, revenue: paid.reduce((s, p) => s + p.amount, 0),
      videos: assets.filter((a) => a.content_type.startsWith("video/")).length,
      files: assets.length, per_product,
    };
  }],

  ["get", /^\/admin\/products\/([^/]+)\/assets$/, async ([pid]) => listFor(pid)],

  ["post", /^\/admin\/products\/([^/]+)\/assets$/, async ([pid], body, opts) => {
    if (!PRODUCT_IDS.includes(pid)) fail(404, "Product not found");
    const file = body.get("file");
    const assets = await getAssets();
    const siblings = assets.filter((a) => a.package_id === pid);
    const storage_id = await storeFile(file, opts.onUploadProgress);
    const doc = {
      id: uid(), package_id: pid, title: body.get("title"), description: body.get("description") || "",
      position: siblings.length ? Math.max(...siblings.map((a) => a.position)) + 1 : 0,
      storage_id, original_filename: file.name, content_type: guessType(file), size: file.size,
      created_at: now(), updated_at: now(),
    };
    await kvSet("assets", [...assets, doc]);
    return assetView(doc);
  }],

  ["post", /^\/admin\/products\/([^/]+)\/assets\/reorder$/, async ([pid], { asset_ids }) => {
    const assets = await getAssets();
    asset_ids.forEach((id, i) => {
      const a = assets.find((x) => x.id === id && x.package_id === pid);
      if (a) a.position = i;
    });
    await kvSet("assets", assets);
    return listFor(pid);
  }],

  ["patch", /^\/admin\/assets\/([^/]+)$/, async ([id], changes) => {
    const assets = await getAssets();
    const a = assets.find((x) => x.id === id) || fail(404, "Asset not found");
    if (changes.package_id && !PRODUCT_IDS.includes(changes.package_id)) fail(404, "Product not found");
    Object.assign(a, changes, { updated_at: now() });
    await kvSet("assets", assets);
    return assetView(a);
  }],

  ["put", /^\/admin\/assets\/([^/]+)\/file$/, async ([id], body, opts) => {
    const assets = await getAssets();
    const a = assets.find((x) => x.id === id) || fail(404, "Asset not found");
    const file = body.get("file");
    const old = a.storage_id;
    Object.assign(a, { storage_id: await storeFile(file, opts.onUploadProgress), original_filename: file.name,
      content_type: guessType(file), size: file.size, updated_at: now() });
    await kvSet("assets", assets);
    await kvDel(`blob:${old}`);
    return assetView(a);
  }],

  ["delete", /^\/admin\/assets\/([^/]+)$/, async ([id]) => {
    const assets = await getAssets();
    const a = assets.find((x) => x.id === id) || fail(404, "Asset not found");
    await kvSet("assets", assets.filter((x) => x.id !== id));
    await kvDel(`blob:${a.storage_id}`);
    return { status: "ok" };
  }],

  ["get", /^\/assets\/([^/]+)\/download$/, async ([id]) => {
    const a = (await getAssets()).find((x) => x.id === id) || fail(404, "Asset not found");
    return (await kvGet(`blob:${a.storage_id}`)) || fail(404, "File not found");
  }],

  ["get", /^\/admin\/users$/, async (_, __, opts) => {
    const q = (opts.params?.q || "").toLowerCase();
    return (await getUsers()).filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).map(userView);
  }],

  ["patch", /^\/admin\/users\/([^/]+)$/, async ([id], changes) => {
    const users = await getUsers();
    const u = users.find((x) => x.id === id) || fail(404, "User not found");
    if (id === DEMO_ADMIN.id && changes.role === "user") fail(400, "You can't remove your own admin access");
    if (changes.purchases) {
      const unknown = changes.purchases.filter((p) => !PRODUCT_IDS.includes(p));
      if (unknown.length) fail(400, `Unknown product: ${unknown.join(", ")}`);
      changes = { ...changes, purchases: [...new Set(changes.purchases)] };
    }
    Object.assign(u, changes);
    await kvSet("users", users);
    return userView(u);
  }],

  ["delete", /^\/admin\/users\/([^/]+)$/, async ([id]) => {
    if (id === DEMO_ADMIN.id) fail(400, "You can't delete your own account");
    const users = await getUsers();
    users.find((x) => x.id === id) || fail(404, "User not found");
    await kvSet("users", users.filter((x) => x.id !== id));
    return { status: "ok" };
  }],

  ["get", /^\/admin\/payments$/, async () => {
    const [payments, users] = await Promise.all([getPayments(), getUsers()]);
    const name = Object.fromEntries(CATALOG.map((p) => [p.id, p.name]));
    return payments.map((p) => {
      const u = users.find((x) => x.id === p.user_id);
      return { ...p, user_email: u?.email ?? null, user_name: u?.name ?? null, product_name: name[p.package_id] || p.package_id };
    }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }],
];

async function handle(method, url, body, opts = {}) {
  const path = url.split("?")[0];
  for (const [m, rx, fn] of routes) {
    const match = m === method && path.match(rx);
    if (match) return { data: await fn(match.slice(1).map(decodeURIComponent), body, opts) };
  }
  return fail(404, "Not found");
}

// Same call shape as the axios instance in lib/api.js.
export const demoApi = {
  get: (url, opts) => handle("get", url, undefined, opts),
  delete: (url, opts) => handle("delete", url, undefined, opts),
  post: (url, body, opts) => handle("post", url, body, opts),
  put: (url, body, opts) => handle("put", url, body, opts),
  patch: (url, body, opts) => handle("patch", url, body, opts),
};

// Object URL for playing a stored video in <video>.
export async function demoVideoSrc(assetId) {
  const { data } = await handle("get", `/assets/${assetId}/download`);
  return URL.createObjectURL(data);
}

export async function resetDemo() {
  await kv("readwrite", (s) => s.clear());
}
