---
"@betagouv/aides-velo": major
---

- Technique - `aidesAvecLocalisation` renommé en `aidesWithLocalisation`

  Ajout d'informations supplémentaires concernant la collectivité associée à
  une aide. Il est désormais possible de récupérer les informations concernant
  la commune la plus peuplée liée à une aide depuis `aidesWithLocalisation` :

  - `codeInsee` - le code Insee (ex: 31555),
  - `epci` - le nom de l'EPCI (ex: "Toulouse Métropole"),
  - `departement` - le code département (ex: "31"),
  - `region` - le code région (ex: "76"),
  - `population` - le nombre d'habitant·es (ex: 514819),
  - `slug` - un identifiant unique pouvant être utilisée dans une URL (ex: "igny-91").

  Ces informations sont utiles afin de pouvoir récupérer toutes les aides
  éligibles pour une commune et sont utilisées par https://mesaidesvelo.fr.
