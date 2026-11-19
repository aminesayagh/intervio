// ISO 3166-1 alpha-2 codes; names come from the browser (Intl.DisplayNames) in the UI language.
// Countries of registration only: territories whose companies register in another country's register
// (French overseas regions → FR, Åland → FI, Greenland → DK, Svalbard → NO, Caribbean Netherlands → NL,
// Australian islands → AU) and uninhabited territories are left out (decision 80).
const CODES =
  'AD AE AF AG AI AL AM AO AR AS AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG ' +
  'CH CI CK CL CM CN CO CR CU CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE ' +
  'GG GH GI GM GN GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP ' +
  'KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MP MR MS MT MU MV MW MX MY MZ ' +
  'NA NC NE NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PN PR PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG ' +
  'SH SI SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC ' +
  'VE VG VI VN VU WF WS YE ZA ZM ZW'

/** Countries as { code, name }, sorted by name in the given language. */
export function countries(language: string) {
  const names = new Intl.DisplayNames([language], { type: 'region' })
  return CODES.split(' ')
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, language))
}
