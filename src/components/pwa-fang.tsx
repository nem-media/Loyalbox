/**
 * FANGER `beforeinstallprompt`, FØR REACT NÅR AT LYTTE.
 *
 * DET ER GRUNDEN TIL, AT ANDROID VISTE EN VEJLEDNING I STEDET FOR EN KNAP.
 * Chrome fyrer eventet, så snart siden opfylder installationskravene — og det
 * sker typisk FØR React har hydreret. `PwaInstall` lyttede i en `useEffect`,
 * som pr. definition først kører efter hydreringen, så eventet var allerede
 * passeret og gik i gulvet. Komponenten så da en browser uden API og foldede
 * de manuelle skridt ud — altså præcis den vej, der er tænkt som RESERVE for
 * iOS, vist til den, der havde den rigtige knap til rådighed.
 *
 * FEJLEN ER TAVS OG AFHÆNGER AF TIMING: på en hurtig maskine kan React nå
 * det, og så virker knappen. Den rammer den langsomme telefon på et dårligt
 * net — altså netop dén, der har mest gavn af at lægge kortet på skærmen.
 * Derfor kan den heller ikke ses ved at prøve på en bærbar.
 *
 * SCRIPTET SKAL KØRE UNDER PARSINGEN og ikke i en komponent; det er hele
 * pointen. Det er derfor et rå `<script>` og ikke `next/script`, som ville
 * blive planlagt efter hydreringen med de strategier, der giver mening for
 * alt andet. Der er ingen `script-src` i vores CSP (kun `frame-ancestors`),
 * så et inline-script er tilladt — se `sikkerhedsheadere.test.ts`.
 *
 * EVENTET KAN KUN BRUGES ÉN GANG. Derfor lægges det i en global, og
 * `PwaInstall` rydder den, når dialogen har været åbne. `appinstalled` rydder
 * den også: er kortet lagt på, er der intet tilbage at installere.
 */

/** Navnet på globalen. Ét sted, så scriptet og komponenten ikke kan blive uenige. */
export const INSTALL_GLOBAL = "__loyalsumInstall";

/** Sættes, når browseren melder, at kortet ER lagt på hjemmeskærmen. */
export const INSTALLERET_GLOBAL = "__loyalsumInstalleret";

/** Beskeden, scriptet sender, når eventet er fanget. */
export const INSTALL_HAENDELSE = "loyalsum:installklar";

const SCRIPT = `(function(){var g=window;g.${INSTALL_GLOBAL}=null;g.${INSTALLERET_GLOBAL}=false;
g.addEventListener("beforeinstallprompt",function(e){e.preventDefault();g.${INSTALL_GLOBAL}=e;
g.dispatchEvent(new Event("${INSTALL_HAENDELSE}"))});
g.addEventListener("appinstalled",function(){g.${INSTALL_GLOBAL}=null;g.${INSTALLERET_GLOBAL}=true;
g.dispatchEvent(new Event("${INSTALL_HAENDELSE}"))})})();`;

export function PwaFang() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
