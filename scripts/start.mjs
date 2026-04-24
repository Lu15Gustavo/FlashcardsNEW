import http from "node:http";
import next from "next";

const host = "0.0.0.0";
const port = Number(process.env.PORT ?? 8080);

const app = next({ dev: false, hostname: host, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = http.createServer((req, res) => {
  void handle(req, res);
});

server.listen(port, host, () => {
  console.log(`Ready on http://${host}:${port}`);
});
