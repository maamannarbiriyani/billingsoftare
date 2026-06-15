const http = require("http");

const payload = JSON.stringify({
  source: "SWIGGY",
  externalId: `SW-${Math.floor(Math.random() * 1000000)}`,
  items: [
    { name: "Paneer Butter Masala", qty: 2, price: 250, notes: "Extra spicy please" },
    { name: "Garlic Naan", qty: 4, price: 50 },
    { name: "Mango Lassi", qty: 2, price: 100 }
  ]
});

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/webhooks/orders",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => {
    data += chunk;
  });
  res.on("end", () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${data}`);
  });
});

req.on("error", (error) => {
  console.error("Error sending Swiggy order:", error.message);
  console.log("\nMake sure the billing-system dev server is running on port 3000!");
});

req.write(payload);
req.end();
console.log("Simulated Swiggy order sent to webhook...");
