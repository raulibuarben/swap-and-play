const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const publicDir = path.join(__dirname, "public");
const jwtSecret = process.env.JWT_SECRET || "swap-and-play-development-secret";

const users = [
  {
    id: "u-demo",
    name: "Alex Rivera",
    email: "demo@swapplay.com",
    location: "Austin, TX",
    avatar: "AR",
    passwordHash: null,
    salt: null
  }
];

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return {
    salt,
    passwordHash: crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex")
  };
}

const demoCredentials = hashPassword("demo1234");
users[0] = { ...users[0], ...demoCredentials };

const listings = [
  { id: "l1", ownerId: "u-demo", title: "The Legend of Zelda: Tears of the Kingdom", console: "Nintendo Switch", condition: "Like new", price: 48, type: "game", description: "Complete with case and inserts. Barely played.", image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=900&q=80", status: "available" },
  { id: "l2", ownerId: "u-demo", title: "PlayStation 5 DualSense", console: "PlayStation 5", condition: "Excellent", price: 58, type: "accessory", description: "Midnight Black controller. Fully functional.", image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=900&q=80", status: "available" },
  { id: "l3", ownerId: "u-demo", title: "Cyberpunk 2077", console: "Xbox Series X", condition: "Good", price: 22, type: "game", description: "Disc in good condition. Ready for next-gen.", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80", status: "available" }
];

const offers = [];
const transactions = [
  { id: "t1", listingId: "l-history", title: "Mario Kart 8 Deluxe", counterparty: "Jamie K.", kind: "Sold", amount: 42, date: "2026-10-18", status: "Completed" }
];

function base64url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 }));
  const signature = crypto.createHmac("sha256", jwtSecret).update(`${header}.${body}`).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const signature = crypto.createHmac("sha256", jwtSecret).update(`${parts[0]}.${parts[1]}`).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  if (signature.length !== parts[2].length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(parts[2]))) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function sendJson(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error("Invalid JSON")); }
    });
  });
}

function getUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token ? verifyToken(token) : null;
  return payload ? users.find(user => user.id === payload.sub) : null;
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, location: user.location, avatar: user.avatar };
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const method = req.method;

    try {
      if (method === "POST" && url.pathname === "/api/register") {
        const body = await readJson(req);
        if (!body.name || !body.email || !body.password) return sendJson(res, 400, { error: "Name, email, and password are required" });
        if (body.password.length < 8) return sendJson(res, 400, { error: "Password must be at least 8 characters" });
        if (users.some(user => user.email.toLowerCase() === body.email.toLowerCase())) return sendJson(res, 409, { error: "Email is already registered" });
        const credentials = hashPassword(body.password);
        const user = { id: `u${Date.now()}`, name: body.name.trim(), email: body.email.trim().toLowerCase(), location: body.location || "Location not set", avatar: body.name.trim().split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase(), ...credentials };
        users.push(user);
        return sendJson(res, 201, { token: signToken({ sub: user.id }), user: publicUser(user) });
      }

      if (method === "POST" && url.pathname === "/api/login") {
        const body = await readJson(req);
        const user = users.find(candidate => candidate.email.toLowerCase() === String(body.email || "").toLowerCase());
        if (!user) return sendJson(res, 401, { error: "Invalid email or password" });
        const hash = crypto.pbkdf2Sync(String(body.password || ""), user.salt, 100000, 32, "sha256").toString("hex");
        if (!crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"))) return sendJson(res, 401, { error: "Invalid email or password" });
        return sendJson(res, 200, { token: signToken({ sub: user.id }), user: publicUser(user) });
      }

      if (method === "GET" && url.pathname === "/api/listings") {
        const search = (url.searchParams.get("search") || "").toLowerCase();
        const consoleFilter = url.searchParams.get("console");
        const result = listings.filter(listing => listing.status === "available")
          .filter(listing => !search || `${listing.title} ${listing.description} ${listing.console}`.toLowerCase().includes(search))
          .filter(listing => !consoleFilter || consoleFilter === "All" || consoleFilter === "All consoles" || listing.console === consoleFilter)
          .map(listing => ({ ...listing, owner: publicUser(users.find(user => user.id === listing.ownerId)) }));
        return sendJson(res, 200, result);
      }

      const user = getUser(req);
      if (method === "GET" && url.pathname === "/api/me") {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        return sendJson(res, 200, publicUser(user));
      }
      if (method === "PUT" && url.pathname === "/api/me") {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        const body = await readJson(req);
        if (body.name) user.name = body.name.trim();
        if (body.location) user.location = body.location.trim();
        return sendJson(res, 200, publicUser(user));
      }
      if (method === "POST" && url.pathname === "/api/listings") {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        const body = await readJson(req);
        if (!body.title || !body.console || !body.price) return sendJson(res, 400, { error: "Title, console, and price are required" });
        const listing = { id: `l${Date.now()}`, ownerId: user.id, title: body.title.trim(), console: body.console, condition: body.condition || "Good", price: Number(body.price), type: body.type || "game", description: body.description || "", image: body.image || "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=900&q=80", status: "available" };
        listings.unshift(listing);
        return sendJson(res, 201, { ...listing, owner: publicUser(user) });
      }
      if (method === "GET" && url.pathname === "/api/my/listings") {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        return sendJson(res, 200, listings.filter(listing => listing.ownerId === user.id));
      }
      if (method === "POST" && url.pathname === "/api/offers") {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        const body = await readJson(req);
        const listing = listings.find(candidate => candidate.id === body.listingId);
        if (!listing || listing.status !== "available") return sendJson(res, 404, { error: "Listing not found" });
        if (listing.ownerId === user.id) return sendJson(res, 400, { error: "You cannot make an offer on your own listing" });
        if (!body.amount && body.type !== "swap") return sendJson(res, 400, { error: "Offer amount is required" });
        const offer = { id: `o${Date.now()}`, listingId: listing.id, listingTitle: listing.title, buyerId: user.id, sellerId: listing.ownerId, type: body.type === "swap" ? "swap" : "money", amount: body.amount ? Number(body.amount) : null, swapItem: body.swapItem || "", message: body.message || "", status: "pending", createdAt: new Date().toISOString() };
        offers.push(offer);
        return sendJson(res, 201, offer);
      }
      if (method === "GET" && url.pathname === "/api/offers") {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        return sendJson(res, 200, offers.filter(offer => offer.buyerId === user.id || offer.sellerId === user.id).map(offer => ({
          ...offer,
          buyer: publicUser(users.find(candidate => candidate.id === offer.buyerId)),
          seller: publicUser(users.find(candidate => candidate.id === offer.sellerId))
        })));
      }
      if (method === "PATCH" && /^\/api\/offers\/[^/]+$/.test(url.pathname)) {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        const offerId = url.pathname.split("/").pop();
        const offer = offers.find(candidate => candidate.id === offerId);
        if (!offer) return sendJson(res, 404, { error: "Offer not found" });
        if (offer.sellerId !== user.id) return sendJson(res, 403, { error: "Only the seller can respond" });
        const body = await readJson(req);
        if (!["accepted", "declined"].includes(body.status)) return sendJson(res, 400, { error: "Status must be accepted or declined" });
        offer.status = body.status;
        if (body.status === "accepted") {
          const listing = listings.find(candidate => candidate.id === offer.listingId);
          listing.status = "sold";
          const buyer = users.find(candidate => candidate.id === offer.buyerId);
          transactions.unshift({ id: `t${Date.now()}`, listingId: listing.id, title: listing.title, counterparty: buyer.name, kind: "Sold", amount: offer.amount, date: new Date().toISOString().slice(0, 10), status: "Completed" });
        }
        return sendJson(res, 200, offer);
      }
      if (method === "GET" && url.pathname === "/api/transactions") {
        if (!user) return sendJson(res, 401, { error: "Authentication required" });
        return sendJson(res, 200, transactions);
      }

      let relativePath = url.pathname === "/" ? "/index.html" : url.pathname;
      relativePath = decodeURIComponent(relativePath).replace(/^\/+/, "");
      const filePath = path.join(publicDir, relativePath);
      if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        return res.end("Not found");
      }
      const ext = path.extname(filePath);
      const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml" };
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      sendJson(res, error.message === "Invalid JSON" ? 400 : 500, { error: error.message });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, () => console.log(`Swap & Play listening on http://localhost:${port}`));
}

module.exports = { createServer };
