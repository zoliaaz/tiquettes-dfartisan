/**
    Tiquettes - Générateur d'étiquettes pour tableaux et armoires électriques
    Copyright (C) 2024-2026 Christophe LEMOINE
    Adaptation pour DF artisan.

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
 * DF artisan : pictogramme d'étiquette inséré en SVG dans la page, coloré par « color » (currentColor),
 * au lieu d'une image colorée par un filtre CSS : Firefox imprime les éléments filtrés en image basse
 * résolution, alors qu'un SVG dans la page reste vectoriel (net dans le PDF).
 */
import { useEffect, useState } from "react";

const cache = new Map();
function charger(src) {
	if (!cache.has(src)) {
		cache.set(
			src,
			fetch(src)
				.then((r) => (r.ok ? r.text() : ""))
				.then((t) => {
					const d = new DOMParser().parseFromString(t, "image/svg+xml");
					const svg = d.querySelector("svg");
					if (!svg) return "";
					// éditeur (Inkscape) : éléments et attributs inutiles
					d.querySelectorAll("metadata, title").forEach((e) => e.remove());
					[...svg.querySelectorAll("*")].forEach((e) => {
						if (e.namespaceURI !== "http://www.w3.org/2000/svg") e.remove();
					});
					svg.removeAttribute("width");
					svg.removeAttribute("height");
					svg.setAttribute("width", "100%");
					svg.setAttribute("height", "100%");
					svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
					// remplissage par défaut (noir quand rien n'est indiqué) : la couleur du thème
					if (!svg.hasAttribute("fill")) svg.setAttribute("fill", "currentColor");
					let s = new XMLSerializer().serializeToString(svg);
					// noir écrit en dur : remplacé par la couleur du thème
					s = s.replace(/(fill|stroke)(=|:\s*)("?)(#000000|#000|black)\b/gi, "$1$2$3currentColor");
					// « color: #000 » posé sur un tracé ferait de currentColor du noir : retiré
					s = s.replace(/([;"\s])color:\s*(#000000|#000|black)\s*;?/gi, "$1");
					// identifiants uniques (plusieurs fois la même icône dans la page)
					return s.replace(/\bid="([^"]+)"/g, 'id="dfa-$1"').replace(/url\(#([^)]+)\)/g, "url(#dfa-$1)").replace(/href="#([^"]+)"/g, 'href="#dfa-$1"');
				})
				.catch(() => ""),
		);
	}
	return cache.get(src);
}

export default function DfaIcone({ src, couleur, style }) {
	const [svg, setSvg] = useState("");
	useEffect(() => {
		let actif = true;
		charger(src).then((t) => actif && setSvg(t));
		return () => {
			actif = false;
		};
	}, [src]);
	const { filter, ...reste } = style || {};
	return (
		<span
			className="dfa-icone"
			style={{ ...reste, display: "inline-block", color: couleur || "#000000", lineHeight: 0 }}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: icônes de Tiquettes (fichiers locaux)
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
