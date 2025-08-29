import { ServerResponse } from "http";

type SSEClient = ServerResponse;

const clients = new Set<SSEClient>();

export function addClient(res: SSEClient): void {
  clients.add(res);
  res.write(`data: ${JSON.stringify({ message: "SSE connected" })}\n\n`);
}

export function removeClient(res: SSEClient): void {
  clients.delete(res);
}

export function sendToAllClients(data: Record<string, unknown>): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}
