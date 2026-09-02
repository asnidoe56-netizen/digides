export interface ParsedPlnToken {
  token: string;
  customerName?: string;
  tariff?: string;
  power?: string;
  kwh?: string;
}

// A PLN prepaid purchase's `sn` from Digiflazz (written verbatim into
// transactions.provider_transaction_id by the webhook capture, never
// altered) is a "/"-delimited composite: "token/nama/tarif/daya/kwh" —
// e.g. "2638-4647-3625-6466-7942/SAIPUL ATAS/R1/450VA/11,0KWH", confirmed
// empirically against production. Only a 5-part split is treated as that
// composite shape; anything else falls back to the whole string as the
// token with no other fields, so this can never hide or misparse a real
// value that happens not to fit PLN's exact shape.
export function parsePlnToken(sn: string): ParsedPlnToken {
  const parts = sn.split("/");
  if (parts.length >= 5) {
    return {
      token: parts[0].trim(),
      customerName: parts[1].trim(),
      tariff: parts[2].trim(),
      power: parts[3].trim(),
      kwh: parts[4].trim(),
    };
  }
  return { token: sn };
}
