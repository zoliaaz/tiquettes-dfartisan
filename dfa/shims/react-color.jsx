/* DF artisan : remplace le ChromePicker de « react-color » par le sélecteur de couleur du navigateur
   (même usage : props color et onChange({ hex })). */
export function ChromePicker({ color, onChange, width }) {
	const hex = typeof color === "string" ? color : color?.hex ?? "#000000";
	return (
		<div style={{ display: "flex", gap: "8px", alignItems: "center", width: width ? `${width}px` : "auto" }}>
			<input
				type="color"
				value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000"}
				onChange={(e) => onChange?.({ hex: e.target.value })}
				style={{ width: "64px", height: "36px", padding: 0, border: "1px solid #ccc", cursor: "pointer" }}
			/>
			<input
				type="text"
				defaultValue={hex}
				key={hex}
				onBlur={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange?.({ hex: e.target.value.toLowerCase() })}
				style={{ width: "90px", fontFamily: "monospace" }}
			/>
		</div>
	);
}
