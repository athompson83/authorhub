import { expect, it } from "vitest";
import { isbnBarcode } from "./barcode";
it("requires a real ISBN-13 check digit and preserves barcode quiet zones", () => {
  expect(() => isbnBarcode("9780306406158")).toThrow();
  expect(() => isbnBarcode("<script>")).toThrow();
  const svg = isbnBarcode("978-0-306-40615-7");
  expect(svg).toContain('viewBox="0 0 113 80"');
  expect(svg).toContain('aria-label="ISBN 9780306406157"');
  expect(svg).toContain('<rect x="11" y="4" width="1" height="62"/>');
});
