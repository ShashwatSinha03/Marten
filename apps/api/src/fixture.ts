import { createServer, type Server } from "node:http";
async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing fixture address");
  return `http://127.0.0.1:${address.port}`;
}
async function close(server: Server) {
  server.closeAllConnections();
  if (server.listening)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
}
export async function startFixture() {
  let offOriginRequestsReceived = 0;
  const diagnostics: { method: string; path: string }[] = [];
  const offOrigin = createServer((request, response) => {
    offOriginRequestsReceived++;
    if (diagnostics.length < 10) {
      // Fixed labels only: never expose headers, query strings or unknown paths.
      const pathname = (request.url ?? "").split("?")[0];
      diagnostics.push({
        method: ["GET", "HEAD", "POST", "OPTIONS"].includes(request.method ?? "") ? request.method! : "other",
        path: ["/", "/health", "/favicon.ico", "/must-be-blocked", "/external"].includes(pathname) ? pathname : "other",
      });
    }
    response.end("Unexpected request");
  });
  const offOriginUrl = await listen(offOrigin);
  const server = createServer((request, response) => {
    if (request.url === "/hang") return;
    const healthy = request.url === "/" || request.url === "/guide";
    response.writeHead(healthy ? 200 : 404, {
      "Content-Type": "text/html",
      "Content-Security-Policy": `default-src 'self'; img-src ${offOriginUrl}; style-src 'unsafe-inline'`,
    });
    response.end(
      `<!doctype html><html lang="en"><meta charset="utf-8"><title>Marten fixture</title><body style="background:#191511;color:#eee2d2;font:24px system-ui;padding:60px"><h1>${healthy ? "Marten fixture" : "Page not found"}</h1><p>${healthy ? "Controlled browser evidence collection." : "This is an intentional HTTP 404."}</p><a href="/missing">Missing destination</a><br><a href="/hang">Hanging destination</a><a href="/missing#duplicate">Duplicate missing</a><a href="/guide">Healthy guide</a><a href="/logout">Logout</a><a href="${offOriginUrl}/external">External destination</a><a href="mailto:test@example.test">Email</a><a href="http://user:pass@127.0.0.1/">Credentials</a><img hidden src="${offOriginUrl}/must-be-blocked" alt=""></body></html>`,
    );
  });
  try {
    const origin = await listen(server);
    return {
      origin,
      offOriginRequestsReceived: () => offOriginRequestsReceived,
      offOriginRequestDiagnostics: () => diagnostics.map(entry => ({ ...entry })),
      close: async () => {
        await close(server);
        await close(offOrigin);
      },
    };
  } catch (error) {
    await close(offOrigin);
    throw error;
  }
}
