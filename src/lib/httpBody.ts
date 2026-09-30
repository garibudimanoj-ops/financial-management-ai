import { AppError } from './errors';

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new AppError('Request body is too large', 'VALIDATION_ERROR', 413);
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new AppError('Request body is required', 'VALIDATION_ERROR');
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new AppError('Request body is too large', 'VALIDATION_ERROR', 413);
    }
    chunks.push(value);
  }

  const payload = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    payload.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(payload));
  } catch {
    throw new AppError('Request body must be valid JSON', 'VALIDATION_ERROR');
  }
}
