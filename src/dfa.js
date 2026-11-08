/**
    Tiquettes - Générateur d'étiquettes pour tableaux et armoires électriques
    Copyright (C) 2024-2026 Christophe LEMOINE
    Adaptation pour DF artisan : ce fichier relie Tiquettes au logiciel DF artisan.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * Mode « DF artisan » : Tiquettes est servi par DF artisan (même adresse, /tiquettes/), dans un cadre de sa page.
 * - le projet (tableau) est lu et enregistré dans DF artisan : /tiquettes/index.html?dfa=<id> ;
 * - la page de garde reprend les coordonnées de l'entreprise et du client de DF artisan ;
 * - les thèmes personnalisés sont gardés dans DF artisan (« Mes thèmes ») ;
 * - aucune connexion à internet : l'impression passe par le navigateur.
 */

import * as pkg from "../package.json" with { type: "json" };

export const DFA_MODE = import.meta.env.MODE === "dfa";
const params = new URLSearchParams(window.location.search);
export const DFA_ID = DFA_MODE ? params.get("dfa") : null;

const ENTETES = { "Content-Type": "application/json", "X-BatiDevis": "1" };

async function api(methode, chemin, corps) {
	const r = await fetch(chemin, {
		method: methode,
		headers: ENTETES,
		credentials: "same-origin",
		body: corps === undefined ? undefined : JSON.stringify(corps),
	});
	const j = await r.json().catch(() => ({}));
	if (!r.ok) throw new Error(j.erreur || `Erreur ${r.status}`);
	return j;
}

export const dfa = {
	tableau: null, // fiche DF artisan (nom, client, devis, adresse)
	modifieLe: null,
	themes: [], // thèmes enregistrés dans DF artisan
	entreprise: {},
	client: null,
};

const texte = (...l) => l.filter((x) => x && String(x).trim()).join("\n");

/** coordonnées DF artisan -> page de garde de Tiquettes (champs vides seulement : rien n'est écrasé) */
function completerPageDeGarde(swb, remplacerClient = false) {
	const E = dfa.entreprise || {};
	const infos = swb.firstPageInfos || { from: {}, to: {} };
	const from = { ...(infos.from || {}) };
	const to = { ...(infos.to || {}) };
	const vide = (v) => v === null || v === undefined || String(v).trim() === "";
	const deE = {
		logo: E.logo || null,
		name: E.nom_commercial || E.raison_sociale || E.nom || E.dirigeant || null,
		siret: E.siret || null,
		postalAddress: texte(E.adresse, [E.cp, E.ville].filter(Boolean).join(" ")) || null,
		email: E.email || null,
		phone: E.telephone || E.portable || null,
	};
	for (const [k, v] of Object.entries(deE)) if (vide(from[k]) && v) from[k] = v;
	const C = dfa.client;
	const t = dfa.tableau || {};
	if (C || t.adresse) {
		const deC = {
			name: C ? C.nom_affiche || texte(C.societe, C.nom) : null,
			postalAddress: t.adresse || (C ? texte(C.adresse, [C.cp, C.ville].filter(Boolean).join(" ")) : null) || null,
			email: C ? C.email || null : null,
			phone: C ? C.portable || C.telephone || null : null,
		};
		for (const [k, v] of Object.entries(deC)) if ((remplacerClient || vide(to[k])) && v) to[k] = v;
	}
	return { ...swb, firstPageInfos: { from, to } };
}

/**
 * Avant l'affichage : lit le tableau dans DF artisan et le prépare pour Tiquettes
 * (sessionStorage, comme une session de Tiquettes ; jamais localStorage).
 */
export async function dfaDemarrer() {
	if (!DFA_MODE) return;
	try {
		const p = await api("GET", "/api/parametres");
		dfa.entreprise = p.entreprise || {};
		dfa.themes = ((p.plans || {}).tiquettes_themes || []).filter((t) => t && t.name && t.data);
	} catch (e) {
		console.error(e);
	}
	if (!DFA_ID) return;
	const t = await api("GET", `/api/plans/${encodeURIComponent(DFA_ID)}`);
	dfa.tableau = t;
	dfa.modifieLe = t.modifie_le;
	if (t.client_id) {
		try {
			dfa.client = await api("GET", `/api/clients/${t.client_id}`);
		} catch (e) {
			console.error(e);
		}
	}
	const d = t.donnees || {};
	sessionStorage.removeItem(pkg.name);
	if (d.switchboard) {
		sessionStorage.setItem(pkg.name, JSON.stringify(completerPageDeGarde(d.switchboard)));
	}
	if (d.printOptions) {
		sessionStorage.setItem(`${pkg.name}_printOptions`, JSON.stringify(d.printOptions));
	}
}

/** nouveau projet (vide) : nom du tableau DF artisan et coordonnées */
export function dfaNouveauProjet(swb) {
	if (!DFA_MODE) return swb;
	const nom = dfa.tableau?.nom;
	return completerPageDeGarde({ ...swb, ...(nom && (!swb.prjname || swb.prjname === import.meta.env.VITE_DEFAULT_PROJECT_NAME) ? { prjname: nom } : {}) });
}

let minuterie = null;
let enCours = Promise.resolve();
let dernier = null;
/** enregistre le tableau dans DF artisan (regroupé : une écriture au plus par seconde) */
export function dfaEnregistrer(switchboard, printOptions) {
	if (!DFA_ID) return;
	dernier = { switchboard, printOptions };
	clearTimeout(minuterie);
	minuterie = setTimeout(() => {
		const donnees = dernier;
		enCours = enCours.then(() =>
			api("PUT", `/api/plans/${encodeURIComponent(DFA_ID)}`, { donnees, _modifie_le: dfa.modifieLe })
				.then((r) => {
					dfa.modifieLe = r.modifie_le;
					window.parent?.postMessage({ dfa: "enregistre" }, window.location.origin);
				})
				.catch((e) => {
					window.parent?.postMessage({ dfa: "erreur", message: e.message }, window.location.origin);
					console.error(e);
				}),
		);
	}, 800);
}

/** thèmes personnalisés gardés dans DF artisan */
export async function dfaEnregistrerTheme(theme, titre) {
	const nom = `custom|dfa_${Date.now()}`;
	const t = { ...theme, name: nom, title: titre, group: "Mes thèmes" };
	const themes = [...dfa.themes.filter((x) => x.title !== titre), t];
	await api("PUT", "/api/parametres", { plans: { tiquettes_themes: themes } });
	dfa.themes = themes;
	return t;
}
export async function dfaSupprimerTheme(nom) {
	const themes = dfa.themes.filter((x) => x.name !== nom);
	await api("PUT", "/api/parametres", { plans: { tiquettes_themes: themes } });
	dfa.themes = themes;
}

// la page DF artisan qui contient Tiquettes signale ses propres modifications (nom, client…) : date à jour
if (DFA_MODE) {
	window.addEventListener("message", (e) => {
		if (e.origin !== window.location.origin || !e.data) return;
		if (e.data.dfa === "modifie_le") dfa.modifieLe = e.data.valeur;
		if (e.data.dfa === "tableau" && e.data.tableau) {
			// client, devis ou adresse changés dans DF artisan : la page de garde prend le nouveau client
			const ancien = dfa.tableau?.client_id;
			dfa.tableau = { ...dfa.tableau, ...e.data.tableau };
			const id = dfa.tableau.client_id;
			(id ? api("GET", `/api/clients/${id}`) : Promise.resolve(null))
				.then((c) => {
					dfa.client = c;
					dfa.surChangement?.(String(ancien ?? "") !== String(id ?? ""));
				})
				.catch((er) => console.error(er));
		}
	});
}

/* Impression par le navigateur : page de garde (dans Tiquettes en ligne, elle est faite par le serveur PDF) */
const echap = (t) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
const dateFr = (d) => {
	const x = d ? new Date(d) : null;
	return x && !Number.isNaN(x.getTime()) ? x.toLocaleDateString("fr-FR") : "";
};
export function dfaPageDeGarde(swb, po) {
	const v = po?.pdfOptions?.firstPageView || {};
	const inf = swb.firstPageInfos || {};
	const bloc = (titre, champs, vues, avecLogo) => {
		const f = inf[champs] || {};
		const w = v[champs] || {};
		const lignes = [
			w.name && f.name && `<div class="g-nom">${echap(f.name)}</div>`,
			w.siret && f.siret && `<div>SIRET : ${echap(f.siret)}</div>`,
			w.postalAddress && f.postalAddress && `<div>${echap(f.postalAddress)}</div>`,
			w.phone && f.phone && `<div>${echap(f.phone)}</div>`,
			w.email && f.email && `<div>${echap(f.email)}</div>`,
		].filter(Boolean);
		const logo = avecLogo && w.logo && f.logo ? `<img class="g-logo" src="${f.logo}" alt="">` : "";
		return lignes.length || logo ? `<div class="g-bloc"><div class="g-titre">${titre}</div>${logo}${lignes.join("")}</div>` : "";
	};
	const ligne = (lib, val, vue) => (vue && val ? `<tr><th>${lib}</th><td>${echap(val)}</td></tr>` : "");
	const t = dfa.tableau || {};
	const el = document.createElement("section");
	el.className = "dfa-garde";
	el.innerHTML = `
		<div class="g-haut">${bloc("Entreprise", "from", "from", true)}${bloc("Client", "to", "to", false)}</div>
		<div class="g-titre-projet">${echap(v.projectName !== false ? swb.prjname : "")}</div>
		<div class="g-sous">Tableau électrique${t.adresse ? ` — ${echap(t.adresse.replace(/\n/g, ", "))}` : ""}</div>
		<table class="g-infos">
			${ligne("Révision", swb.prjversion, v.projectVersion)}
			${ligne("Date de création", dateFr(swb.prjcreated), v.projectCreated)}
			${ligne("Dernière modification", dateFr(swb.prjupdated), v.projectUpdated)}
			${ligne("Type d'installation", swb.projectType === "T" ? "Tertiaire" : swb.projectType === "R" ? "Résidentiel" : "", v.projectType)}
			${ligne("Devis", t.document_numero, !!t.document_numero)}
		</table>
		<div class="g-pied">Étiquettes réalisées avec Tiquettes (Christophe Lemoine, tiquettes.fr)</div>`;
	return el;
}

/** page de garde à jour avec DF artisan (nouveau client : ses coordonnées remplacent les anciennes) */
export const dfaCompleterPageDeGarde = (swb, remplacerClient = false) => (DFA_MODE ? completerPageDeGarde(swb, remplacerClient) : swb);

/** cases « afficher » de la page de garde : si aucune n'est cochée pour l'entreprise (ou le client),
 *  on coche celles qui ont une valeur, pour que les coordonnées reprises de DF artisan se voient */
export function dfaActiverVues(po, swb) {
	if (!DFA_MODE) return po;
	const inf = swb?.firstPageInfos || {};
	const vues = { ...(po?.pdfOptions?.firstPageView || {}) };
	let change = false;
	for (const part of ["from", "to"]) {
		const v = { ...(vues[part] || {}) };
		if (Object.values(v).some(Boolean)) continue;
		for (const [k, val] of Object.entries(inf[part] || {})) {
			if (val && String(val).trim()) {
				v[k] = true;
				change = true;
			}
		}
		vues[part] = v;
	}
	return change ? { ...po, pdfOptions: { ...po.pdfOptions, firstPageView: vues } } : po;
}

/* Impression du schéma en folios (comme le PDF de tiquettes.fr) : feuilles A4 paysage de taille fixe,
   « Schéma unifilaire - Folio N » en haut à gauche, nom du tableau et révision en haut à droite, trait,
   pagination en bas et version de Tiquettes en bas à droite. Le découpage est fait ici (et non par le
   navigateur) : chaque groupe (tête, différentiel et ses départs) est recopié sur la feuille où il tient. */
const FOLIO_CONTENU_MM = 196 - 11 - 7; // page 210 mm - marges 2 × 7 mm - en-tête - pied
export function dfaPreparerFolios(swb) {
	dfaRetirerFolios();
	const schema = document.querySelector(".schema");
	const tete = schema?.querySelector(".schemaItem.isFirst");
	if (!schema || !tete) return;
	const enfants = tete.querySelector(":scope > .schemaItemChilds");
	const groupes = enfants ? [...enfants.children].filter((e) => e.classList.contains("schemaItem")) : [];
	const zone = document.createElement("div");
	zone.className = "dfa-folios";
	schema.after(zone);
	const pages = [];
	const nouvelleFeuille = (avecTete) => {
		const f = document.createElement("section");
		f.className = "dfa-folio";
		f.innerHTML = `<div class="dfa-folio-tete"><b class="dfa-folio-titre"></b><span>${echap(swb.prjname || "")}${swb.prjversion ? ` - rév. ${echap(swb.prjversion)}` : ""}</span></div>
			<div class="dfa-folio-contenu"><div class="schema"><div class="schemaGrid"><div class="schemaItem isFirst"></div></div></div></div>
			<div class="dfa-folio-pied"><span></span><span class="dfa-folio-num"></span><span>${echap(pkg.title)} ${echap(pkg.version)}</span></div>`;
		const item = f.querySelector(".schemaItem.isFirst");
		if (avecTete) for (const c of tete.children) if (c !== enfants) item.append(c.cloneNode(true));
		const ch = document.createElement("div");
		ch.className = "schemaItemChilds";
		item.append(ch);
		zone.append(f);
		pages.push(f);
		return { f, ch, contenu: f.querySelector(".dfa-folio-contenu"), n: 0 };
	};
	let page = nouvelleFeuille(true);
	const deborde = (p) => p.contenu.scrollHeight > p.contenu.clientHeight + 1;
	for (const g of groupes) {
		const copie = g.cloneNode(true);
		page.ch.append(copie);
		if (deborde(page) && (page.n > 0 || page.f === pages[0] && page.ch.previousSibling)) {
			copie.remove();
			page = nouvelleFeuille(false);
			page.ch.append(copie);
		}
		page.n++;
	}
	pages.forEach((f, i) => {
		f.querySelector(".dfa-folio-titre").textContent = `Schéma unifilaire - Folio ${i + 1}`;
		f.querySelector(".dfa-folio-num").textContent = `Page ${i + 1} / ${pages.length}`;
	});
	document.body.classList.add("dfa-avec-folios");
}
export function dfaRetirerFolios() {
	document.querySelectorAll(".dfa-folios").forEach((z) => z.remove());
	document.body.classList.remove("dfa-avec-folios");
}

/* Options d'impression des étiquettes (faites par le serveur PDF dans Tiquettes en ligne) :
   calibre sous chaque module, lignes de coupe avec ciseaux, format A4 ou A3. Ajoutées juste avant l'impression. */
export function dfaPreparerEtiquettes(swb, po) {
	const pdf = po?.pdfOptions || {};
	const style = document.createElement("style");
	style.className = "dfa-impression";
	// format A3 choisi pour les étiquettes : toutes les feuilles en A3 paysage (sinon A4 paysage, comme avant)
	if (pdf.labelsPrintFormat === "A3") {
		style.textContent = "@page { size: A3 landscape; }";
		document.head.append(style);
	}
	document.body.classList.add("dfa-etiquettes-format");
	const lignes = [...document.querySelectorAll(".switchboard .row")];
	lignes.forEach((ligne, i) => {
		const modules = [...ligne.querySelectorAll(":scope > .module, :scope .module")].filter((m) => !m.parentElement.closest(".module"));
		if (pdf.labelsCutLines) {
			for (const cote of ["haut", "bas"]) {
				const c = document.createElement("div");
				c.className = `dfa-impression dfa-coupe dfa-coupe-${cote}`;
				ligne.append(c);
			}
			ligne.classList.add("dfa-avec-coupe");
		}
		if (pdf.printCurrents) {
			const donnees = (swb.rows?.[i] || []).filter(Boolean);
			const bande = document.createElement("div");
			bande.className = "dfa-impression dfa-calibres";
			modules.forEach((m, k) => {
				const d = donnees[k] || {};
				const cel = document.createElement("div");
				cel.style.width = `${m.getBoundingClientRect().width}px`;
				cel.textContent = d.free ? "" : [`${d.crb ?? ""}${d.current ?? ""}`, d.sensibility, d.type].map((x) => String(x ?? "").trim()).filter(Boolean).join(" ");
				bande.append(cel);
			});
			ligne.after(bande);
		}
	});
}
export function dfaRetirerImpression() {
	dfaRetirerFolios();
	document.querySelectorAll(".dfa-impression").forEach((e) => e.remove());
	document.querySelectorAll(".dfa-avec-coupe").forEach((e) => e.classList.remove("dfa-avec-coupe"));
	document.body.classList.remove("dfa-etiquettes-format");
}
