const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("../server");

async function startServer() {
  const server = createServer();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

async function request(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json();
  return { response, body };
}

test("demo login and protected profile", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const login = await request(baseUrl, "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "demo@swapplay.com", password: "demo1234" })
    });
    assert.equal(login.response.status, 200);
    assert.ok(login.body.token);

    const profile = await request(baseUrl, "/api/me", {
      headers: { Authorization: "Bearer " + login.body.token }
    });
    assert.equal(profile.response.status, 200);
    assert.equal(profile.body.email, "demo@swapplay.com");

    const denied = await request(baseUrl, "/api/me");
    assert.equal(denied.response.status, 401);
  } finally {
    server.close();
  }
});

test("registration, listing, offer, and transaction flow", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const registration = await request(baseUrl, "/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Taylor Reed", email: "taylor@example.com", password: "securepass", location: "Seattle, WA" })
    });
    assert.equal(registration.response.status, 201);
    const token = registration.body.token;
    const auth = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

    const listing = await request(baseUrl, "/api/listings", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ title: "Hades", console: "Nintendo Switch", condition: "Good", price: 25, description: "Cart only" })
    });
    assert.equal(listing.response.status, 201);

    const search = await request(baseUrl, "/api/listings?search=Hades");
    assert.equal(search.response.status, 200);
    assert.equal(search.body.some(item => item.title === "Hades"), true);

    const offer = await request(baseUrl, "/api/offers", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ listingId: "l1", type: "money", amount: 40, message: "Interested" })
    });
    assert.equal(offer.response.status, 201);
  } finally {
    server.close();
  }
});

test("static application is served", async () => {
  const { server, baseUrl } = await startServer();
  try {
    const result = await fetch(`${baseUrl}/`);
    assert.equal(result.status, 200);
    assert.match(result.headers.get("content-type"), /text\/html/);
    assert.match(await result.text(), /Swap &amp; Play|Swap & Play/);
  } finally {
    server.close();
  }
});
