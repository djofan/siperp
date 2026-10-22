// Expose only the payment webhook through a local testing tunnel, never the admin API.
import http from "node:http";
const path = "/api/v1/payment/webhook/ipaymu";
const server = http.createServer((request, response) => {
  if (request.url !== path || request.method !== "POST") { response.writeHead(404); response.end(); return; }
  const chunks = []; let size = 0;
  request.on("data", chunk => {
    size += chunk.length;
    if (size > 65536) { response.writeHead(413); response.end(); request.destroy(); return; }
    chunks.push(chunk);
  });
  request.on("end", () => {
    if (size > 65536) return;
    const body = Buffer.concat(chunks);
    const headers = { "content-type": request.headers["content-type"] || "application/json", "content-length": body.length, accept: "application/json" };
    for (const key of ["x-signature", "x-timestamp", "x-external-id"]) if (request.headers[key]) headers[key] = request.headers[key];
    const upstream = http.request({ hostname: "127.0.0.1", port: 8000, path, method: "POST", headers, timeout: 30000 }, result => {
      response.writeHead(result.statusCode || 502, { "content-type": "application/json", "cache-control": "no-store" });
      result.pipe(response);
    });
    upstream.on("timeout", () => upstream.destroy());
    upstream.on("error", () => { if (!response.headersSent) response.writeHead(502); response.end(); });
    upstream.end(body);
  });
});
server.listen(8011, "127.0.0.1", () => console.log("Callback-only proxy listening on 127.0.0.1:8011"));
