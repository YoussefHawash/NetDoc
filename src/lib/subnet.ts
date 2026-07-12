export type ParsedSubnet = {
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  prefixLength: number;
  totalAddresses: number;
  /** Usable host addresses, excluding network/broadcast for prefixes < 31 */
  firstUsable: string | null;
  lastUsable: string | null;
  usableCount: number;
};

function ipToInt(ip: string): number {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) throw new Error(`Invalid IPv4 address: ${ip}`);
  let result = 0;
  for (const part of parts) {
    const n = Number(part);
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      throw new Error(`Invalid IPv4 address: ${ip}`);
    }
    result = (result << 8) | n;
  }
  return result >>> 0;
}

function intToIp(int: number): string {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join(".");
}

export function isValidIp(ip: string): boolean {
  try {
    ipToInt(ip);
    return true;
  } catch {
    return false;
  }
}

export function isValidCidr(cidr: string): boolean {
  try {
    parseCidr(cidr);
    return true;
  } catch {
    return false;
  }
}

export function parseCidr(cidr: string): ParsedSubnet {
  const [ip, prefixStr] = cidr.trim().split("/");
  if (!ip || prefixStr === undefined) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }
  const prefixLength = Number(prefixStr);
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    throw new Error(`Invalid prefix length in CIDR: ${cidr}`);
  }

  const ipInt = ipToInt(ip);
  const hostBits = 32 - prefixLength;
  const mask = hostBits === 32 ? 0 : (~0 << hostBits) >>> 0;
  const networkInt = (ipInt & mask) >>> 0;
  const totalAddresses = 2 ** hostBits;
  const broadcastInt = (networkInt + totalAddresses - 1) >>> 0;

  const hasUsableRange = prefixLength < 31;
  const firstUsableInt = hasUsableRange ? networkInt + 1 : networkInt;
  const lastUsableInt = hasUsableRange ? broadcastInt - 1 : broadcastInt;
  const usableCount = hasUsableRange
    ? Math.max(totalAddresses - 2, 0)
    : totalAddresses;

  return {
    cidr: `${intToIp(networkInt)}/${prefixLength}`,
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    prefixLength,
    totalAddresses,
    firstUsable: usableCount > 0 ? intToIp(firstUsableInt) : null,
    lastUsable: usableCount > 0 ? intToIp(lastUsableInt) : null,
    usableCount,
  };
}

/** Returns every usable host IP in the subnet, in order. Caps at 65536 to avoid accidental huge loops (e.g. a /8). */
export function listUsableIps(cidr: string, limit = 65536): string[] {
  const parsed = parseCidr(cidr);
  if (!parsed.firstUsable || !parsed.lastUsable) return [];

  const start = ipToInt(parsed.firstUsable);
  const end = ipToInt(parsed.lastUsable);
  const count = Math.min(end - start + 1, limit);

  const ips: string[] = [];
  for (let i = 0; i < count; i++) {
    ips.push(intToIp(start + i));
  }
  return ips;
}

export type IpOccupant = {
  id: string;
  hostname: string;
  ipAddress: string | null;
  kind: "device" | "staticIp";
};

export type IpAllocation = {
  ip: string;
  used: boolean;
  occupantId: string | null;
  occupantKind: "device" | "staticIp" | null;
  hostname: string | null;
};

export function buildAllocationTable(
  cidr: string,
  occupants: IpOccupant[],
  limit = 65536,
): IpAllocation[] {
  const byIp = new Map(
    occupants.filter((o) => o.ipAddress).map((o) => [o.ipAddress as string, o]),
  );

  return listUsableIps(cidr, limit).map((ip) => {
    const occupant = byIp.get(ip);
    return {
      ip,
      used: !!occupant,
      occupantId: occupant?.id ?? null,
      occupantKind: occupant?.kind ?? null,
      hostname: occupant?.hostname ?? null,
    };
  });
}

/** Finds which subnet (if any) an IP falls within. If ranges overlap, the
 * most specific (longest prefix) match wins. */
export function findSubnetForIp<T extends { cidr: string }>(
  ip: string,
  subnets: T[],
): T | null {
  let ipInt: number;
  try {
    ipInt = ipToInt(ip);
  } catch {
    return null;
  }

  let best: T | null = null;
  let bestPrefix = -1;

  for (const subnet of subnets) {
    let parsed: ParsedSubnet;
    try {
      parsed = parseCidr(subnet.cidr);
    } catch {
      continue;
    }
    const networkInt = ipToInt(parsed.networkAddress);
    const broadcastInt = ipToInt(parsed.broadcastAddress);
    if (
      ipInt >= networkInt &&
      ipInt <= broadcastInt &&
      parsed.prefixLength > bestPrefix
    ) {
      best = subnet;
      bestPrefix = parsed.prefixLength;
    }
  }

  return best;
}

export function nextFreeIp(
  cidr: string,
  devices: { ipAddress: string | null }[],
  limit = 65536,
): string | null {
  const used = new Set(devices.map((d) => d.ipAddress).filter(Boolean));
  for (const ip of listUsableIps(cidr, limit)) {
    if (!used.has(ip)) return ip;
  }
  return null;
}
