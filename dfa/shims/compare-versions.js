// DF artisan : « satisfies » de compare-versions, avec semver (déjà utilisé par Tiquettes)
import * as semver from "semver";
export const satisfies = (version, range) => semver.satisfies(semver.coerce(version) ?? "0.0.0", range);
