const io = require("socket.io-client");

async function main() {
  const BASE_URL = "http://localhost:3001/api";
  console.log("1. Logging in...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@quantro.demo", password: "demo1234" }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }

  const { data } = await loginRes.json();
  const token = data.token;
  console.log("Logged in! Token acquired:", token.substring(0, 10) + "...");

  const socketUrl = "http://localhost:3001";
  console.log("2. Connecting to Socket.io server...");
  const socket = io(socketUrl, {
    path: "/socket.io",
    transports: ["polling", "websocket"],
    auth: { token },
  });

  socket.on("connect", () => {
    console.log("Socket connected! ID:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", err.message);
  });

  socket.on("authenticated", (user) => {
    console.log("Socket authenticated successfully as:", user.name);
    
    // Now let's trigger a notification. Since we are admin, let's invite can@quantro.demo to the demo organization.
    // First, let's fetch my organizations.
    triggerInvite(token);
  });

  socket.on("notification:new", (notification) => {
    console.log("[CLIENT RECEIVED notification:new]", notification);
  });

  socket.on("org:member_added", (data) => {
    console.log("[CLIENT RECEIVED org:member_added]", data);
  });
}

async function triggerInvite(token) {
  const BASE_URL = "http://localhost:3001/api";
  
  // 1. Get organizations
  const orgsRes = await fetch(`${BASE_URL}/organizations`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const orgs = await orgsRes.json();
  const org = orgs.find(o => o.name === "Quantro Demo") || orgs[0];
  if (!org) {
    console.error("No organization found");
    return;
  }
  console.log(`Using organization: ${org.name} (ID: ${org.id})`);

  // 2. Clear any pending invite or member for can@quantro.demo first if needed to prevent ConflictError
  // Let's just invite can@quantro.demo.
  console.log("Sending invitation to can@quantro.demo...");
  const inviteRes = await fetch(`${BASE_URL}/organizations/${org.id}/members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ email: "can@quantro.demo", role: "MEMBER" })
  });

  const inviteResult = await inviteRes.json();
  console.log("Invite API result:", inviteResult);
}

main().catch(console.error);
