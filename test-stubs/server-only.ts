/**
 * Tom stand-in for pakken `server-only` under test.
 *
 * `server-only` er en VAGT FOR BUNDLEREN: importeres et modul, der har den,
 * ind i browserens bundt, fejler byggeriet. Next løser navnet internt, så
 * pakken ligger ikke i node_modules — og i vitest kan den derfor ikke slås
 * op. Uden den her fil er hver eneste server-only fil utestbar, og det er
 * fem af dem.
 *
 * At stubbe den svækker ikke vagten: den virker i BYGGERIET, som er der, den
 * skal virke. I en test er der hverken bundler eller browser, og der er intet
 * for den at beskytte.
 */
export {};
