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
import { useMemo } from "react";

import schemaFunctions from "../schema_functions.json" with { type: "json" };
import LazyImage from "./LazyImage";

export default function SchemaSymbol({
	module,
	limited = false,
	onEdit = null,
	monitor = {},
}) {
	const func = useMemo(() => {
		if (!module?.func) return null;

		const func = module?.func;
		const isContact = func === "k";

		if (!schemaFunctions[func] && !isContact) return null;

		let obj = schemaFunctions[func];
		if (isContact) {
			obj = {
				name: "Contacteur",
				hasPole: true,
				hasCurrent: true,
				hasWire: true,
			};
		}

		const name = obj?.name ?? "";
		const titleErrors = monitor.errors?.[module.id]
			? `\r\n\r\n⚠ : ${monitor.errors[module.id].join("\r\n⚠ : ")}`
			: "";
		const titleInfos = monitor.infos?.[module.id]
			? `\r\n\r\n🛈 ${monitor.infos[module.id].join("\r\n🛈 ")}`
			: "";
		const remark = (module.remark ?? "").trim();

		let title =
			`${module.id} / ${name}: ${module.text}${titleErrors}${titleInfos}`.trim();
		if (remark !== "") {
			title += `\r\n\r\nRemarques:\r\n${remark}`;
		}

		const icon =
			`${import.meta.env.BASE_URL}` +
			(isContact &&
			(schemaFunctions.kc.hasNONCChoice === true ||
				schemaFunctions.tl.hasNONCChoice === true)
				? `schema_${func}${module.kcType === "NC" ? "_nc" : ""}.svg`
				: `schema_${func}.svg`);

		return { obj, name, title, icon, isContact };
	}, [module, monitor]);

	const handleEdit = () => {
		if (onEdit) onEdit(module);
	};

	// DF artisan : bobine des contacteurs et télérupteurs dessinée à l'horizontale, symbole moins haut
	const court = DFA_MODE && (module.func === "kc" || module.func === "tl") && module.kcType !== "NC";
	const hauteur = court ? 60 : 100;

	return (
		func && (
			<div
				style={{ "--symbol-width": "70px", "--symbol-height": `${hauteur}px` }}
				className={`schemaItemSymbol editable ${limited ? "limited" : ""} ${court ? "dfaCourt" : ""}`.trim()}
				title={func.title}
				onClick={() => handleEdit()}
			>
				<LazyImage
					className="schemaItemSymbolImg"
					src={court ? `${import.meta.env.BASE_URL}schema_${module.func}_dfa.svg` : func.icon}
					alt={func.name}
					width={70}
					height={hauteur}
				/>
				<div className="schemaItemSymbolId">{module.id}</div>
				{module.line && (
					<div className="schemaItemSymbolLine">L{module.line}</div>
				)}

				{func.obj?.hasType && (
					<div className="schemaItemSymbolType">
						{module.type ? "Type" : ""} {module.type}
						<br />
						{module.sensibility}
					</div>
				)}

				<div className="schemaItemSymbolCurrent">
					{(
						(func.obj?.hasCrb && module.crb ? `${module.crb} ` : "") +
						(func.obj?.hasCurrent && module.current ? module.current : "")
					).trim()}
				</div>

				{func.obj?.hasPole && module.pole && (
					<>
						<div className="schemaItemSymbolPole">{module.pole}</div>
						<LazyImage
							className="schemaItemSymbolImgPole"
							src={`${import.meta.env.VITE_APP_BASE}schema_${module.pole}.svg`}
							alt={module.pole}
							width={11}
						/>
					</>
				)}

				{monitor.errors?.[module.id] && (
					<LazyImage
						className="schemaItemSymbolWarning notprintable"
						src={`${import.meta.env.BASE_URL}schema_warning.svg`}
						alt="Erreur"
					/>
				)}
			</div>
		)
	);
}
