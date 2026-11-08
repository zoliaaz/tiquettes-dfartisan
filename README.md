# Tiquettes pour DF artisan

Adaptation de **[Tiquettes](https://github.com/pantaflex44/Tiquettes)** (générateur d'étiquettes pour tableaux et
armoires électriques, de **Christophe LEMOINE**, [tiquettes.fr](https://www.tiquettes.fr)) pour fonctionner **hors
ligne** à l'intérieur de **DF artisan**, logiciel de devis et factures pour artisans.

Tout le travail de Tiquettes (étiquettes, thèmes, schéma unifilaire, nomenclature, contrôle NF C 15-100) est celui de
son auteur. Cette adaptation ajoute seulement ce qu'il faut pour l'utiliser depuis DF artisan.

## Ce qui change par rapport à Tiquettes

- **Projets enregistrés dans DF artisan** : chaque tableau est une fiche de DF artisan, rattachée à un client, un devis
  et une adresse de chantier (`index.html?dfa=<id>`). Le projet est lu et enregistré automatiquement par l'API locale de
  DF artisan, plus dans le stockage du navigateur.
- **Page de garde** : remplie avec les coordonnées de l'entreprise (logo, nom, SIRET, adresse, téléphone, e-mail) et du
  client de DF artisan (seulement les champs vides : rien n'est écrasé).
- **Mes thèmes** : un thème modifié peut être enregistré dans DF artisan et resservir pour les autres tableaux.
- **Hors ligne** : aucune connexion à tiquettes.fr (pas de statistiques, de vérification de version ni de redirection).
  L'impression passe par le navigateur (page de garde, étiquettes à la taille exacte des modules, schéma, nomenclature) ;
  « Microsoft Print to PDF » donne un fichier PDF. L'export pour étiqueteuses, qui demande le serveur de tiquettes.fr,
  est retiré.
- **Étiquettes imprimées nettes** : pictogrammes insérés en SVG (vectoriels) au lieu d'images colorées par un filtre
  CSS, que Firefox imprime en image basse résolution ; options du menu Imprimer prises en compte : calibre sous chaque
  module, lignes de coupe avec ciseaux, format A4 ou A3.
- **Schéma imprimé en folios** (comme le PDF de tiquettes.fr) : feuilles A4 paysage avec « Schéma unifilaire - Folio N »,
  nom du tableau et révision, trait, pagination et version de Tiquettes ; chaque groupe reste entier sur sa feuille.
- **Schéma** : bobine des télérupteurs et contacteurs dessinée à l'horizontale (symbole moins haut) ; à l'impression,
  chaque groupe (différentiel et ses départs) reste entier sur une page.
- **Construction sans Vite** : `node dfa/build.mjs` (esbuild) produit `dist-dfa/`. Le sélecteur de couleur de
  `react-color` est remplacé par celui du navigateur, `sanitize-filename` et `compare-versions` par de petites
  fonctions équivalentes (`dfa/shims/`).

Fichiers ajoutés : `src/dfa.js`, `src/dfaIcone.jsx`, `dfa/`, `public/dfa.css`, `public/schema_kc_dfa.svg`, `public/schema_tl_dfa.svg`, `.env.dfa`, `README.md` (présentation d'origine renommée `README-TIQUETTES.md`).
Fichiers modifiés (marqués « DF artisan » dans le code) : `src/App.jsx`, `src/main.jsx`, `src/components/Module.jsx`, `src/components/LazyImage.jsx`, `src/components/SchemaSymbol.jsx`, `src/components/ThemeEngine.jsx`,
`package.json`, `.gitignore`.

La présentation d'origine de Tiquettes est dans [README-TIQUETTES.md](README-TIQUETTES.md).

Cette version n'a pas vocation à suivre toutes les évolutions de Tiquettes : elle part de **Tiquettes 2.2.9**.

## Construire

```
npm install react react-dom semver esbuild
node dfa/build.mjs
```

Le dossier `dist-dfa/` est l'application. Pour une version à installer dans DF artisan, zippez son **contenu**
sous le nom `Tiquettes-DF-artisan.zip` et publiez-le dans les « Releases » de ce dépôt
([github.com/zoliaaz/tiquettes-dfartisan](https://github.com/zoliaaz/tiquettes-dfartisan)) : DF artisan le télécharge
à l'adresse `releases/latest/download/Tiquettes-DF-artisan.zip`. Dans DF artisan :
Paramètres > Général > Modules > « Installer / mettre à jour Tiquettes… ».

## Licence

GNU Affero General Public License v3 (fichier `LICENSE`), comme Tiquettes. DF artisan est un programme distinct :
il affiche Tiquettes dans un cadre et échange les données par son API, sans en faire partie.
