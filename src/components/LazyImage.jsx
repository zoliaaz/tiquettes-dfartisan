/**
 Tiquettes - Générateur d'étiquettes pour tableaux et armoires électriques
 Copyright (C) 2024-2026 Christophe LEMOINE
 Modifié en novembre 2026 pour « Tiquettes pour DF artisan » (voir README.md).

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

import { DFA_MODE } from "../dfa.js";
import { useCallback, useEffect, useRef, useState } from "react";

import blankIcon from "../assets/blank.svg";

function LazyImage({
	src = null,
	width = 16,
	height = 16,
	alt = "",
	root = null,
	rootMargin = "0px",
	threshold = 0,
	lazy: lazyDemande = true,
	onlyInView: onlyInViewDemande = true,
	...props
}) {
	// DF artisan : images chargées tout de suite (fichiers locaux) pour que l'impression ait tous les symboles,
	// même ceux des onglets non affichés (schéma, nomenclature)
	const lazy = DFA_MODE ? false : lazyDemande;
	const onlyInView = DFA_MODE ? false : onlyInViewDemande;
	const [imageSrc, setImageSrc] = useState(lazy && onlyInView ? null : src);
	const imageRef = useRef();

	const callback = useCallback((entries) => {
		const [entry] = entries;
		if (entry.isIntersecting && imageSrc === null) {
			setImageSrc(src);
		}
	}, []);

	useEffect(() => {
		const observer = new IntersectionObserver(callback, {
			root,
			rootMargin,
			threshold,
		});
		if (lazy && onlyInView) {
			observer.observe(imageRef.current);
		} else {
			observer.unobserve(imageRef.current);
		}

		return () => {
			observer.disconnect();
		};
	}, [callback, root, rootMargin, threshold, imageRef, lazy, onlyInView]);

	useEffect(() => {
		if (!lazy || !onlyInView || imageSrc !== null) {
			setImageSrc(src);
		}
	}, [imageSrc, src, lazy, onlyInView]);

	return (
		<img
			alt={""}
			width={width}
			height={height}
			{...props}
			style={{ ...(props?.style ?? {}), width, height }}
			ref={imageRef}
			src={imageSrc ?? blankIcon}
			loading={lazy ? "lazy" : "eager"}
			data-lazy={lazy}
			data-onlyinview={onlyInView}
		/>
	);
}

export default LazyImage;
