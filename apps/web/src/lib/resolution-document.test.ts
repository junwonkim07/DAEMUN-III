import assert from "node:assert/strict";
import test from "node:test";
import { downloadResolution, resolutionDocumentInfo } from "./resolution-document";

test("DOCX downloads preserve the original Korean filename and ignore URL queries", () => {
  assert.deepEqual(resolutionDocumentInfo("https://files.example/id.docx?download=1#file", "결의안 최종.docx"), {
    filename: "결의안 최종.docx", label: "DOCX",
  });
  assert.equal(resolutionDocumentInfo("/uploads/id.PDF").label, "PDF");
  assert.equal(resolutionDocumentInfo("/uploads/id.doc").label, "DOC");
  assert.equal(resolutionDocumentInfo("/uploads/id.png").label, "PNG");
});

test("old uploads without filename metadata remain downloadable", () => {
  assert.deepEqual(resolutionDocumentInfo("/uploads/id.docx", null), { filename: "id.docx", label: "DOCX" });
  assert.deepEqual(resolutionDocumentInfo("/docs/Example%20One.docx"), { filename: "Example One.docx", label: "DOCX" });
  assert.equal(resolutionDocumentInfo("/unknown").label, "FILE");
});

test("cross-origin response bytes are downloaded through a blob with the original name", async (t) => {
  const bytes = new Uint8Array([80, 75, 3, 4, 0, 255]);
  t.mock.method(globalThis, "fetch", async () => new Response(bytes));
  let downloaded: Blob | undefined;
  t.mock.method(URL, "createObjectURL", (blob: Blob) => { downloaded = blob; return "blob:test"; });
  let clicked = false;
  let removed = false;
  const link = { href: "", download: "", click: () => { clicked = true; }, remove: () => { removed = true; } };
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    createElement: () => link, body: { appendChild: () => {} },
  } });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  });
  t.mock.method(globalThis, "setTimeout", () => 0);
  await downloadResolution("https://files.example/id.docx", "Original name.docx");
  assert.equal(link.download, "Original name.docx");
  assert.equal(link.href, "blob:test");
  assert.ok(clicked && removed);
  assert.deepEqual(new Uint8Array(await downloaded!.arrayBuffer()), bytes);
});

test("failed downloads do not save an error response as a document", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
  await assert.rejects(downloadResolution("https://files.example/id.docx", "Original.docx"), /Download failed/);
});
