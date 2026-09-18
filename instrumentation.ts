// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/modules/lazsip/api/wiring");
  }
}