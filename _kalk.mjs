import { chromium } from "playwright";
const SP = process.argv[2];
const browser = await chromium.launch();
for (const [nama, lebar] of [["k-390", 390], ["k-768", 768], ["k-1280", 1280]]) {
  const page = await browser.newPage({ viewport: { width: lebar, height: 900 } });
  await page.goto("http://localhost:3100/#hitung", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const kolom = await page.evaluate(
    () => getComputedStyle(document.querySelector(".papan")).gridTemplateColumns,
  );
  const kotak = await page.evaluate(() => {
    const kiri = document.querySelector(".papan-kiri").getBoundingClientRect();
    const kanan = document.querySelector(".papan-kanan").getBoundingClientRect();
    return { lebarKiri: Math.round(kiri.width), lebarKanan: Math.round(kanan.width), bertumpuk: kanan.top >= kiri.bottom - 2 };
  });
  console.log(`${lebar}px: kolom=${kolom} | kiri=${kotak.lebarKiri} kanan=${kotak.lebarKanan} | bertumpuk=${kotak.bertumpuk}`);
  await page.locator("#hitung").screenshot({ path: `${SP}/${nama}.png` });
}
await browser.close();
