const state = { token: localStorage.getItem("swapToken"), user: JSON.parse(localStorage.getItem("swapUser") || "null"), authMode: "login", offerType: "money", offerListingId: null };

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = "Bearer " + state.token;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function requireAuth() {
  if (state.token) return true;
  openAuth("login");
  showToast("Sign in to continue");
  return false;
}

function updateHeader() {
  document.getElementById("headerName").textContent = state.user ? state.user.name : "Sign in";
  document.getElementById("headerAvatar").textContent = state.user ? state.user.avatar : "?";
  document.getElementById("profileButton").onclick = () => state.user ? openProfile() : openAuth("login");
}

function openAuth(mode) {
  setAuthMode(mode);
  document.getElementById("authDialog").showModal();
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll("[data-auth]").forEach(button => button.classList.toggle("active", button.dataset.auth === mode));
  document.querySelector(".name-field").classList.toggle("hidden", mode !== "register");
  document.querySelector("#authTitle").textContent = mode === "register" ? "Join Swap & Play" : "Welcome back";
  document.querySelector("#authForm button[type=submit]").textContent = mode === "register" ? "Create account" : "Sign in";
}

async function loadListings() {
  try {
    const search = document.getElementById("searchInput").value;
    const consoleFilter = document.getElementById("consoleFilter").value;
    const listings = await api(`/api/listings?search=${encodeURIComponent(search)}&console=${encodeURIComponent(consoleFilter)}`);
    document.getElementById("listingCount").textContent = `${listings.length} listings`;
    document.getElementById("listingGrid").innerHTML = listings.map(listingCard).join("");
  } catch (error) { showToast(error.message); }
}

function listingCard(listing) {
  return `<article class="listing-card">
    <div class="listing-image"><img src="${listing.image}" alt="${escapeHtml(listing.title)}"><span class="condition">${escapeHtml(listing.condition)}</span></div>
    <div class="listing-body">
      <div class="listing-meta">${escapeHtml(listing.console)} · ${escapeHtml(listing.owner.location)}</div>
      <h3>${escapeHtml(listing.title)}</h3>
      <div class="listing-bottom"><strong class="price">$${listing.price}</strong><button class="offer-button" data-offer="${listing.id}">Make offer</button></div>
    </div>
  </article>`;
}

async function loadMyListings() {
  if (!state.token) return;
  try {
    const listings = await api("/api/my/listings");
    document.getElementById("myListingsGrid").innerHTML = listings.length ? listings.map(listingCard).join("") : `<p>You haven't listed any items yet.</p>`;
  } catch (error) { showToast(error.message); }
}

async function loadActivity() {
  if (!state.token) return;
  try {
    const [offers, transactions] = await Promise.all([api("/api/offers"), api("/api/transactions")]);
    document.getElementById("offersList").innerHTML = offers.length ? offers.map(offer => `<div class="activity-row"><div><strong>${escapeHtml(offer.listingTitle)}</strong><div>${offer.type === "swap" ? `Swap: ${escapeHtml(offer.swapItem)}` : `$${offer.amount}`}</div></div><span class="status">${offer.status}</span></div>`).join("") : `<p>No offers yet.</p>`;
    document.getElementById("transactionsList").innerHTML = transactions.length ? transactions.map(transaction => `<div class="activity-row"><div><strong>${escapeHtml(transaction.title)}</strong><div>${escapeHtml(transaction.counterparty)} · ${transaction.date}</div></div><strong>${transaction.amount ? `$${transaction.amount}` : transaction.kind}</strong></div>`).join("") : `<p>No transactions yet.</p>`;
  } catch (error) { showToast(error.message); }
}

function escapeHtml(value = "") {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function switchView(view) {
  if ((view === "listings" || view === "activity") && !requireAuth()) return;
  document.querySelectorAll("[data-view]").forEach(element => element.classList.toggle("active", element.dataset.view === view));
  document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  document.getElementById("marketView").classList.toggle("hidden", view !== "market");
  document.getElementById("listingsView").classList.toggle("hidden", view !== "listings");
  document.getElementById("activityView").classList.toggle("hidden", view !== "activity");
  document.getElementById("hero").classList.toggle("hidden", view !== "market");
  document.getElementById("marketControls").classList.toggle("hidden", view !== "market");
  if (view === "listings") loadMyListings();
  if (view === "activity") loadActivity();
}

function openListingDialog() {
  if (!requireAuth()) return;
  document.getElementById("listingDialog").showModal();
}

function openOffer(listingId) {
  if (!requireAuth()) return;
  state.offerListingId = listingId;
  document.querySelector("#offerForm [name=listingId]").value = listingId;
  document.getElementById("offerDialog").showModal();
}

function openProfile() {
  document.querySelector("#profileName").textContent = state.user.name;
  document.querySelector("#profileForm [name=name]").value = state.user.name;
  document.querySelector("#profileForm [name=location]").value = state.user.location;
  document.getElementById("profileDialog").showModal();
}

document.querySelectorAll("[data-view]").forEach(element => element.addEventListener("click", () => switchView(element.dataset.view)));
document.querySelectorAll("[data-auth]").forEach(button => button.addEventListener("click", () => setAuthMode(button.dataset.auth)));
document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => document.getElementById(button.dataset.close).close()));
document.getElementById("newListingButton").addEventListener("click", openListingDialog);
document.getElementById("newListingButtonSecondary").addEventListener("click", openListingDialog);
document.getElementById("listingGrid").addEventListener("click", event => { const button = event.target.closest("[data-offer]"); if (button) openOffer(button.dataset.offer); });
document.getElementById("searchInput").addEventListener("input", () => loadListings());
document.getElementById("consoleFilter").addEventListener("change", loadListings);
document.getElementById("filterButton").addEventListener("click", () => document.getElementById("consoleFilter").focus());

document.getElementById("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = Object.fromEntries(form.entries());
  try {
    const data = await api(state.authMode === "register" ? "/api/register" : "/api/login", { method:"POST", body:JSON.stringify(payload) });
    state.token = data.token; state.user = data.user;
    localStorage.setItem("swapToken", data.token); localStorage.setItem("swapUser", JSON.stringify(data.user));
    document.getElementById("authDialog").close(); updateHeader(); loadListings();
    showToast(state.authMode === "register" ? "Account created" : "Welcome back");
  } catch (error) { document.getElementById("authError").textContent = error.message; }
});

document.getElementById("listingForm").addEventListener("submit", async event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target).entries());
  try {
    await api("/api/listings", { method:"POST", body:JSON.stringify(payload) });
    event.target.reset(); document.getElementById("listingDialog").close();
    loadListings(); loadMyListings(); switchView("listings"); showToast("Listing published");
  } catch (error) { showToast(error.message); }
});

document.querySelectorAll("[data-offer-type]").forEach(button => button.addEventListener("click", () => {
  state.offerType = button.dataset.offerType;
  document.querySelectorAll("[data-offer-type]").forEach(candidate => candidate.classList.toggle("active", candidate === button));
  document.querySelector(".amount-field").classList.toggle("hidden", state.offerType !== "money");
  document.querySelector(".swap-field").classList.toggle("hidden", state.offerType !== "swap");
  document.querySelector("#offerForm [name=type]").value = state.offerType;
}));

document.getElementById("offerForm").addEventListener("submit", async event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target).entries());
  try {
    await api("/api/offers", { method:"POST", body:JSON.stringify(payload) });
    event.target.reset(); document.getElementById("offerDialog").close(); showToast("Offer sent");
  } catch (error) { showToast(error.message); }
});

document.getElementById("profileForm").addEventListener("submit", async event => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.target).entries());
  try {
    state.user = await api("/api/me", { method:"PUT", body:JSON.stringify(payload) });
    localStorage.setItem("swapUser", JSON.stringify(state.user)); updateHeader();
    document.getElementById("profileDialog").close(); showToast("Profile updated");
  } catch (error) { showToast(error.message); }
});

document.getElementById("logoutButton").addEventListener("click", () => {
  state.token = null; state.user = null;
  localStorage.removeItem("swapToken"); localStorage.removeItem("swapUser");
  document.getElementById("profileDialog").close(); updateHeader(); switchView("market"); showToast("Signed out");
});

updateHeader();
loadListings();
