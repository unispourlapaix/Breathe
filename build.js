// Assemble les modules de src/ en UN seul fichier HTML autonome : docs/index.html
// Usage : node build.js
// (docs/ est le dossier que GitHub Pages peut servir directement)
const fs = require("fs");
const path = require("path");

const dev = fs.readFileSync("index.html", "utf8")
  .replace(/src="(assets\/[a-z0-9-]+\.webp)"/g, (_, assetPath) => {
    const encoded = fs.readFileSync(assetPath).toString("base64");
    return `src="data:image/webp;base64,${encoded}"`;
  });
const tagRe = /<script src="(src\/[^"]+\.js)"><\/script>/g;

const files = [...dev.matchAll(tagRe)].map(m => m[1]);
if (files.length === 0) { console.error("Aucune balise <script src=\"src/...\"> trouvée."); process.exit(1); }

const code = files.map(f => fs.readFileSync(f, "utf8")).join("\n\n");
const firstTag = dev.indexOf(`<script src="${files[0]}">`);
const lastTag = dev.lastIndexOf(`<script src="${files[files.length - 1]}"></script>`) + `<script src="${files[files.length - 1]}"></script>`.length;

const out = dev.slice(0, firstTag) + "<script>\n" + code + "\n</script>" + dev.slice(lastTag);

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(path.join("docs", "index.html"), out);
fs.copyFileSync("manifest.webmanifest", path.join("docs", "manifest.webmanifest"));
fs.mkdirSync(path.join("docs", "assets"), { recursive: true });
fs.mkdirSync(path.join("docs", "assets", "mp3"), { recursive: true });
for (const track of fs.readdirSync(path.join("assets", "mp3"))) {
  if (track.endsWith(".mp3")) {
    fs.copyFileSync(path.join("assets", "mp3", track), path.join("docs", "assets", "mp3", track));
  }
}
for (const size of [32, 180, 192, 512]) {
  const icon = path.join("assets", `icon-${size}.png`);
  fs.copyFileSync(icon, path.join("docs", icon));
}
console.log(`OK : docs/index.html (${files.length} modules, ${Math.round(out.length / 1024)} Ko)`);
