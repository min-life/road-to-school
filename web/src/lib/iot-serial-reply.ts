export type SerialReply = {
  requestId: string;
  ok: boolean;
  data?: Record<string, unknown>;
};

export function parseSerialReply(line: string): SerialReply | null {
  if (line.length > 8192) return null;
  try {
    const value: unknown = JSON.parse(line);
    if (!value || typeof value !== "object") return null;
    const reply = value as Record<string, unknown>;
    if (typeof reply.requestId !== "string" || typeof reply.ok !== "boolean") return null;
    return {
      requestId: reply.requestId,
      ok: reply.ok,
      data:
        reply.data && typeof reply.data === "object" && !Array.isArray(reply.data)
          ? (reply.data as Record<string, unknown>)
          : undefined,
    };
  } catch {
    return null;
  }
}
