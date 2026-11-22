/** EAN-13 encodes an assigned ISBN-13. Quiet zones are part of the SVG. */
export function isbnBarcode(isbn: string, width = 1.6): string {
  const digits = isbn.replace(/[\s-]/g, "");
  if (
    !/^97[89]\d{10}$/.test(digits) ||
    [...digits].reduce((sum, d, i) => sum + Number(d) * (i % 2 ? 3 : 1), 0) %
      10 !==
      0
  )
    throw new Error("A valid ISBN-13 is required for the barcode.");
  const left = [
    "0001101",
    "0011001",
    "0010011",
    "0111101",
    "0100011",
    "0110001",
    "0101111",
    "0111011",
    "0110111",
    "0001011",
  ];
  const even = [
    "0100111",
    "0110011",
    "0011011",
    "0100001",
    "0011101",
    "0111001",
    "0000101",
    "0010001",
    "0001001",
    "0010111",
  ];
  const parity = [
    "LLLLLL",
    "LLGLGG",
    "LLGGLG",
    "LLGGGL",
    "LGLLGG",
    "LGGLLG",
    "LGGGLL",
    "LGLGLG",
    "LGLGGL",
    "LGGLGL",
  ][Number(digits[0])]!;
  let bits = "101";
  for (let i = 1; i <= 6; i++)
    bits += (parity[i - 1] === "L" ? left : even)[Number(digits[i])]!;
  bits += "01010";
  for (let i = 7; i < 13; i++)
    bits += left[Number(digits[i])]!.replace(/[01]/g, (b) =>
      b === "0" ? "1" : "0",
    );
  bits += "101";
  const bars = [...bits]
    .flatMap((bit, i) =>
      bit === "1"
        ? [
            `<rect x="${i + 11}" y="4" width="1" height="${i < 3 || (i >= 45 && i < 50) || i >= 92 ? 62 : 56}"/>`,
          ]
        : [],
    )
    .join("");
  const text =
    `<text x="3" y="76">${digits[0]}</text>` +
    [...digits.slice(1)]
      .map(
        (digit, i) =>
          `<text text-anchor="middle" x="${i < 6 ? 17.5 + i * 7 : 64.5 + (i - 6) * 7}" y="76">${digit}</text>`,
      )
      .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.min(2.5, Math.max(1.4, width))}in" viewBox="0 0 113 80" role="img" aria-label="ISBN ${digits}"><rect width="113" height="80" fill="white"/><g fill="black">${bars}</g><g fill="black" font-family="Arial,sans-serif" font-size="9">${text}</g></svg>`;
}
