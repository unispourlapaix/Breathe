// Assemble les modules de src/ en UN seul fichier HTML autonome : docs/index.html
// Usage : node build.js
// (docs/ est le dossier que GitHub Pages peut servir directement)
const fs = require("fs");
const path = require("path");

const dev = fs.readFileSync("index.html", "utf8");
const tagRe = /<script src="(src\/[^"]+\.js)"><\/script>/g;

const files = [...dev.matchAll(tagRe)].map(m => m[1]);
if (files.length === 0) { console.error("Aucune balise <script src=\"src/...\"> trouvée."); process.exit(1); }

const code = files.map(f => fs.readFileSync(f, "utf8")).join("\n\n");
const firstTag = dev.indexOf(`<script src="${files[0]}">`);
const lastTag = dev.lastIndexOf(`<script src="${files[files.length - 1]}"></script>`) + `<script src="${files[files.length - 1]}"></script>`.length;

const out = dev.slice(0, firstTag) + "<script>\n" + code + "\n</script>" + dev.slice(lastTag);

fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(path.join("docs", "index.html"), out);
console.log(`OK : docs/index.html (${files.length} modules, ${Math.round(out.length / 1024)} Ko)`);
