/* F1 SNAP — manually maintained race highlights.
   Jolpica remains the source for schedules, dates, results and race status.
   null means no manually supplied video, whether the race is past or future.
   After a GP, replace its null with the full YouTube URL.
*/
const F1_HIGHLIGHTS = {
  // ================================================================
  // 2025 RACES
  // ================================================================
  2025: {
    1: "https://youtu.be/lL_d84cN1UY?si=wOjyHgZAyfSNEQNI", // AUSTRALIAN GRAND PRIX
    2: "https://youtu.be/t8HpVlineX4?si=l-ERGbtta3IpkVda", // CHINESE GRAND PRIX
    3: "https://youtu.be/oAtYfF0_4-I?si=oAW44OycuKtXAWaf", // JAPANESE GRAND PRIX
    4: "https://youtu.be/bFXLP487kXo?si=yNIr7RtJ-VgfT9bK", // BAHRAIN GRAND PRIX
    5: "https://youtu.be/Li93iQDZQeg?si=LkKE_w67AtTtb6FD", // SAUDI ARABIAN GRAND PRIX
    6: "https://youtu.be/5gYys4GL7S0?si=s3_DKQfxrEYFXaSW", // MIAMI GRAND PRIX
    7: "https://youtu.be/xkRXnrvFCY0?si=YgRFVB6SFjq_Fa8W", // EMILIA ROMAGNA GRAND PRIX
    8: "https://youtu.be/ipOT9ruRobc?si=QnhaKHZGGNkotmPF", // MONACO GRAND PRIX
    9: "https://youtu.be/Ey8j_BlLvFM?si=cCyJP_h8nc3P-CTA", // SPANISH GRAND PRIX
    10: "https://youtu.be/QrRh2vOJQbw?si=-3EN3S7C9i_w_B4S", // CANADIAN GRAND PRIX
    11: "https://youtu.be/usP9O0zFVaA?si=7C7oTSXrHChDlI58", // AUSTRIAN GRAND PRIX
    12: "https://youtu.be/sOQLODs9ipc?si=4d4ikf6FlvJs91qp", // BRITISH GRAND PRIX
    13: "https://youtu.be/yApM21L0GgY?si=CRx5LCHQhaCjvNwc", // BELGIAN GRAND PRIX
    14: "https://youtu.be/hrPtK5D5yn4?si=5gHXB4L8t2KWZh1G", // HUNGARIAN GRAND PRIX
    15: "https://youtu.be/JIRqdeNl2cU?si=MVqEQPXuHRZM5QzS", // DUTCH GRAND PRIX
    16: "https://youtu.be/kGMp1Byuwto?si=D3mS7dxC68m6FjxL", // ITALIAN GRAND PRIX
    17: "https://youtu.be/JntKOmbMI08?si=3bkUsLNlZ-7VvLag", // AZERBAIJAN GRAND PRIX
    18: "https://youtu.be/XZhXFbFCOu4?si=4cfZjow-c4lXCSCw", // SINGAPORE GRAND PRIX
    19: "https://youtu.be/CdKwc1bC44c?si=IOujrgLA8PG9mOW5", // UNITED STATES GRAND PRIX
    20: "https://youtu.be/hTqxfkWRimk?si=4DqP99SIe9--SIV1", // MEXICO CITY GRAND PRIX
    21: "https://youtu.be/MK83clSv6-k?si=wBs8qXbzW0nAw-d-", // SÃO PAULO GRAND PRIX
    22: "https://youtu.be/uQc-pW3QLuI?si=AxVYFylS9zPOxNtc", // LAS VEGAS GRAND PRIX
    23: "https://youtu.be/BeaVJggQ2dc?si=CMs7t0VFkdEsi7Hl", // QATAR GRAND PRIX
    24: "https://youtu.be/S-LMSpzlnc0?si=YVuzIobb_GQKhmav", // ABU DHABI GRAND PRIX
  },

  // ================================================================
  // 2026 RACES
  // ================================================================
  // Round order checked against formula1.com/en/racing/2026 on 2026-09-15.
  // If the calendar changes, keep round keys aligned with Jolpica.
  2026: {
    1: "https://youtu.be/lL_d84cN1UY", // Australian Grand Prix
    2: "https://youtu.be/t8HpVlineX4", // Chinese Grand Prix
    3: "https://youtu.be/oAtYfF0_4-I", // Japanese Grand Prix
    4: "https://youtu.be/5gYys4GL7S0", // Miami Grand Prix
    5: "https://youtu.be/QrRh2vOJQbw", // Canadian Grand Prix
    6: "https://youtu.be/ipOT9ruRobc", // Monaco Grand Prix
    7: "https://youtu.be/Ey8j_BlLvFM", // Barcelona-Catalunya Grand Prix
    8: "https://youtu.be/usP9O0zFVaA", // Austrian Grand Prix
    9: "https://youtu.be/rnjmSOUYVp8", // British Grand Prix
    10: "https://youtu.be/I6RfOY_7leA", // Belgian Grand Prix
    11: "https://youtu.be/_JeaXt_3Mhc", // Hungarian Grand Prix
    12: "https://youtu.be/3OMLs3yI-KE", // Dutch Grand Prix
    13: "https://youtu.be/uptj3to1l7o", // Italian Grand Prix
    14: "https://youtu.be/NK7AfP_wi8M", // Spanish Grand Prix
    15: null, // Azerbaijan Grand Prix
    16: null, // Bahrain (Malaysia) Grand Prix
    17: null, // Singapore Grand Prix
    18: null, // United States Grand Prix
    19: null, // Mexico City Grand Prix
    20: null, // São Paulo Grand Prix
    21: null, // Las Vegas Grand Prix
    22: null, // Qatar Grand Prix
    23: null, // Abu Dhabi Grand Prix
  },
};

function getHighlight(season, round) {
  return F1_HIGHLIGHTS[Number(season)]?.[Number(round)] ?? null;
}
