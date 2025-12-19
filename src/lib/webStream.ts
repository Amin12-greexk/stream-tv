import type { Readable } from "node:stream";

type WebStreamOptions = {
  signal?: AbortSignal;
};

/**
 * Convert a Node.js Readable stream to a WHATWG ReadableStream safely.
 * - Handles backpressure via pause/resume.
 * - Destroys the node stream on cancel/abort.
 * - Guards against enqueue/close after the controller is closed.
 */
export function readableToWebStream(
  readable: Readable,
  options: WebStreamOptions = {}
): ReadableStream<Uint8Array> {
  const { signal } = options;

  let closed = false;
  let onData: ((chunk: unknown) => void) | undefined;
  let onEnd: (() => void) | undefined;
  let onClose: (() => void) | undefined;
  let onError: ((err: unknown) => void) | undefined;
  let onAbort: (() => void) | undefined;

  const cleanup = () => {
    if (onData) readable.off("data", onData);
    if (onEnd) readable.off("end", onEnd);
    if (onClose) readable.off("close", onClose);
    if (onError) readable.off("error", onError);
    if (onAbort && signal) signal.removeEventListener("abort", onAbort);
    onData = undefined;
    onEnd = undefined;
    onClose = undefined;
    onError = undefined;
    onAbort = undefined;
  };

  const safeDestroy = () => {
    try {
      readable.destroy();
    } catch {
      // ignore
    }
  };

  return new ReadableStream<Uint8Array>({
    start(controller) {
      onData = (chunk) => {
        if (closed) return;
        try {
          controller.enqueue(chunk as Uint8Array);
        } catch {
          closed = true;
          cleanup();
          safeDestroy();
          try {
            controller.close();
          } catch {
            // ignore
          }
          return;
        }

        const desired = controller.desiredSize;
        if (desired !== null && desired <= 0) {
          try {
            readable.pause();
          } catch {
            // ignore
          }
        }
      };

      onEnd = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      onClose = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      onError = (err) => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.error(err);
        } catch {
          // ignore
        }
      };

      readable.on("data", onData);
      readable.once("end", onEnd);
      readable.once("close", onClose);
      readable.once("error", onError);

      onAbort = () => {
        if (closed) return;
        closed = true;
        cleanup();
        safeDestroy();
        try {
          controller.close();
        } catch {
          // ignore
        }
      };

      if (signal) {
        if (signal.aborted) onAbort();
        else signal.addEventListener("abort", onAbort, { once: true });
      }
    },
    pull() {
      if (closed) return;
      try {
        readable.resume();
      } catch {
        // ignore
      }
    },
    cancel() {
      if (closed) return;
      closed = true;
      cleanup();
      safeDestroy();
    },
  });
}
