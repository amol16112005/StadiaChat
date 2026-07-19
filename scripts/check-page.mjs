import fs from "fs";
const s = fs.readFileSync("src/app/page.tsx", "utf8");
const lines = s.split(/\n/);
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const code = line.charCodeAt(j);
    if (
      code === 0x201c ||
      code === 0x201d ||
      code === 0x2018 ||
      code === 0x2019 ||
      code === 0x2014 ||
      (code > 127 && code !== 0x00b7)
    ) {
      console.log(
        `L${i + 1} col${j + 1} U+${code.toString(16)} ${JSON.stringify(line.slice(Math.max(0, j - 20), j + 20))}`
      );
    }
  }
}
// Also try to find unbalanced quotes in JSX className-ish areas
console.log("--- around 559 ---");
for (let i = 556; i < 565; i++) {
  console.log(i + 1, JSON.stringify(lines[i]));
}
