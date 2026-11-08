/* Construction de « Tiquettes pour DF artisan » (sans Vite) : node dfa/build.mjs
   -> dossier dist-dfa/ : application autonome, hors ligne, servie par DF artisan sous /tiquettes/ */
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sortie = join(racine, "dist-dfa");
const pkg = JSON.parse(readFileSync(join(racine, "package.json"), "utf8"));

// variables d'environnement Vite : .env puis .env.dfa
const env = {};
for (const f of [".env", ".env.dfa"]) {
	const p = join(racine, f);
	if (!existsSync(p)) continue;
	for (const l of readFileSync(p, "utf8").split(/\r?\n/)) {
		const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
		if (m) env[m[1]] = m[2];
	}
}
env.BASE_URL = env.VITE_APP_BASE;
env.MODE = "dfa";
env.PROD = true;
env.DEV = false;

rmSync(sortie, { recursive: true, force: true });
mkdirSync(sortie, { recursive: true });
// fichiers publics (icônes, polices…), sans la partie serveur PHP
// (sans le serveur PHP « api » ni les images du site web : réseaux sociaux, PWA, tuiles Windows)
const inutiles = /(^|[\\/])(api|og.*\.webp|twitter.*|github_.*|robots\.txt|sitemap.*|mstile-.*|pwa-.*|maskable-.*|android-chrome-.*|apple-touch-.*|browserconfig\.xml|site\.webmanifest|infos\.json|tiquettes_stickers\.png|page\.webp|robot\..*)$/;
cpSync(join(racine, "public"), sortie, { recursive: true, filter: (s) => !inutiles.test(s.slice(join(racine, "public").length)) });
cpSync(join(racine, "LICENSE"), join(sortie, "LICENSE"));

const shims = join(racine, "dfa", "shims");
await build({
	entryPoints: [join(racine, "src", "main.jsx")],
	outdir: join(sortie, "app"),
	bundle: true,
	minify: true,
	format: "esm",
	target: ["firefox115", "chrome115"],
	jsx: "automatic",
	loader: { ".svg": "file", ".png": "file", ".jpg": "file", ".webp": "file", ".gif": "file", ".woff": "file", ".woff2": "file", ".ttf": "file" },
	assetNames: "assets/[name]-[hash]",
	publicPath: "./app/",
	define: { "import.meta.env": JSON.stringify(env), "process.env.NODE_ENV": '"production"' },
	alias: {
		"react-color": join(shims, "react-color.jsx"),
		"sanitize-filename": join(shims, "sanitize-filename.js"),
		"compare-versions": join(shims, "compare-versions.js"),
	},
	nodePaths: (process.env.NODE_PATH || "").split(":").filter(Boolean),
	logLevel: "warning",
	plugins: [{
		// import * as pkg from "package.json" : toutes les clés (comme Vite)
		name: "package-json",
		setup(b) {
			// statistiques de tiquettes.fr : remplacées par une fonction vide
			b.onResolve({ filter: /api[\\/]stats\.js$/ }, () => ({ path: join(shims, "stats.js") }));
			b.onLoad({ filter: /package\.json$/ }, (a) => {
				const d = JSON.parse(readFileSync(a.path, "utf8"));
				const cles = Object.keys(d).filter((k) => /^[A-Za-z_$][\w$]*$/.test(k));
				return { contents: `const d = ${JSON.stringify(d)};\nexport default d;\n${cles.map((k) => `export const ${k} = d[${JSON.stringify(k)}];`).join("\n")}`, loader: "js" };
			});
		},
	}],
});

// page d'accueil
let html = readFileSync(join(racine, "dfa", "index.html"), "utf8")
	.replace("%VERSION%", pkg.version);
writeFileSync(join(sortie, "index.html"), html);
writeFileSync(join(sortie, "version.txt"), `${pkg.version}-dfa${env.VITE_DFA_REVISION ? "." + env.VITE_DFA_REVISION : ""}\n`);
writeFileSync(join(sortie, "LISEZMOI.txt"), `Tiquettes ${pkg.version} pour DF artisan
Générateur d'étiquettes pour tableaux et armoires électriques, de Christophe LEMOINE (https://www.tiquettes.fr),
adapté pour fonctionner hors ligne dans DF artisan (projets, coordonnées et thèmes enregistrés dans DF artisan).

Licence : GNU Affero General Public License v3 (fichier LICENSE).
Sources de cette version adaptée : ${env.VITE_DFA_SOURCES}
Projet d'origine : https://github.com/pantaflex44/Tiquettes

Ce dossier est un programme à part : DF artisan l'affiche et lui fournit les données, sans en faire partie.
`);
console.log("dist-dfa/ prêt (Tiquettes " + pkg.version + " pour DF artisan).");
