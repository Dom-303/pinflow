/**
 * PinFlow Preview Smoke Test - Console utilities for testing runtime context capture
 *
 * In Nuxt, the main runtime initialization is handled by the pinflow.client.ts plugin.
 * This file is imported by app.vue to ensure the smoke test utilities are loaded.
 */

console.log('[pinflow-preview] Smoke test module loaded (Nuxt).');
console.log('[pinflow-preview] Runtime initialization handled by Nuxt plugin.');
console.log(
  '[pinflow-preview] Available commands: pinflow.captureElement(el), pinflow.captureSelector(sel), pinflow.listTracked(), pinflow.status()',
);
