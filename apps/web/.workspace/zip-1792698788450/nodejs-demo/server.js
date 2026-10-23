import http from "node:http";

const PORT = parseInt(process.env.PORT || "3000", 10);
const SERVICE_SECRET = process.env.SERVICE_SECRET;

// SRE Demo Failure Hook: Crash if required environment variable is missing
if (!SERVICE_SECRET || SERVICE_SECRET.trim().length === 0) {
  console.error("FATAL ERROR: Missing required environment variable: SERVICE_SECRET");
  console.error("Application failed to start. Configure SERVICE_SECRET in your environment.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "healthy",
        app: "liara-node-demo",
        message: "Hello from Liara Cloud! Deployed by Liara Agent.",
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[liara-node-demo] Server listening on port ${PORT}`);
  console.log(`[liara-node-demo] Health check available at http://0.0.0.0:${PORT}/health`);
});

