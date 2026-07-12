import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.connection.deleteMany();
  await prisma.staticIp.deleteMany();
  await prisma.ispIp.deleteMany();
  await prisma.vpnTunnel.deleteMany();
  await prisma.vlan.deleteMany();
  await prisma.device.deleteMany();
  await prisma.subnet.deleteMany();
  await prisma.site.deleteMany();

  const hq = await prisma.site.create({
    data: { name: "Headquarters", address: "1 Main St, Springfield" },
  });
  const branch = await prisma.site.create({
    data: { name: "Branch Office", address: "22 Commerce Ave, Springfield" },
  });

  const coreSubnet = await prisma.subnet.create({
    data: {
      name: "Core / Servers",
      cidr: "10.0.0.0/28",
      vlanId: 10,
      description: "Core network gear and servers",
      siteId: hq.id,
    },
  });
  const usersSubnet = await prisma.subnet.create({
    data: {
      name: "User Workstations",
      cidr: "10.0.1.0/24",
      vlanId: 20,
      description: "End-user devices",
      siteId: hq.id,
    },
  });
  const branchSubnet = await prisma.subnet.create({
    data: {
      name: "Branch LAN",
      cidr: "10.1.0.0/24",
      vlanId: 30,
      description: "Branch office LAN",
      siteId: branch.id,
    },
  });

  const [coreRouter, coreSwitch, firewall, fileServer, dc] = await Promise.all([
    prisma.device.create({
      data: {
        hostname: "core-rtr-01",
        ipAddress: "10.0.0.1",
        type: "router",
        vendor: "Cisco",
        model: "ISR 4331",
        status: "active",
        owner: "IT Infrastructure",
        siteId: hq.id,
        subnetId: coreSubnet.id,
        positionX: 0,
        positionY: 0,
      },
    }),
    prisma.device.create({
      data: {
        hostname: "core-sw-01",
        ipAddress: "10.0.0.2",
        type: "switch",
        vendor: "Cisco",
        model: "Catalyst 9300",
        status: "active",
        owner: "IT Infrastructure",
        siteId: hq.id,
        subnetId: coreSubnet.id,
        positionX: 220,
        positionY: 0,
      },
    }),
    prisma.device.create({
      data: {
        hostname: "fw-01",
        ipAddress: "10.0.0.3",
        type: "firewall",
        vendor: "Fortinet",
        model: "FortiGate 100F",
        status: "active",
        owner: "IT Security",
        siteId: hq.id,
        subnetId: coreSubnet.id,
        positionX: -220,
        positionY: 0,
      },
    }),
    prisma.device.create({
      data: {
        hostname: "file-srv-01",
        ipAddress: "10.0.0.4",
        type: "server",
        vendor: "Dell",
        model: "PowerEdge R650",
        os: "Windows Server 2022",
        status: "active",
        owner: "IT Infrastructure",
        siteId: hq.id,
        subnetId: coreSubnet.id,
        positionX: 220,
        positionY: 160,
      },
    }),
    prisma.device.create({
      data: {
        hostname: "dc-01",
        ipAddress: "10.0.0.5",
        type: "server",
        vendor: "Dell",
        model: "PowerEdge R650",
        os: "Windows Server 2022",
        status: "active",
        owner: "IT Infrastructure",
        notes: "Primary domain controller",
        siteId: hq.id,
        subnetId: coreSubnet.id,
        positionX: 0,
        positionY: 160,
      },
    }),
  ]);

  const [ws1, ws2] = await Promise.all([
    prisma.device.create({
      data: {
        hostname: "ws-accounting-01",
        ipAddress: "10.0.1.10",
        type: "workstation",
        vendor: "Dell",
        model: "OptiPlex 7010",
        os: "Windows 11",
        status: "active",
        owner: "Jane Doe",
        siteId: hq.id,
        subnetId: usersSubnet.id,
        positionX: -220,
        positionY: 160,
      },
    }),
    prisma.device.create({
      data: {
        hostname: "printer-2f-01",
        ipAddress: "10.0.1.20",
        type: "printer",
        vendor: "HP",
        model: "LaserJet Enterprise M507",
        status: "active",
        siteId: hq.id,
        subnetId: usersSubnet.id,
        positionX: -440,
        positionY: 160,
      },
    }),
  ]);

  const branchRouter = await prisma.device.create({
    data: {
      hostname: "branch-rtr-01",
      ipAddress: "10.1.0.1",
      type: "router",
      vendor: "Cisco",
      model: "ISR 1101",
      status: "maintenance",
      owner: "IT Infrastructure",
      notes: "Scheduled firmware upgrade next quarter",
      siteId: branch.id,
      subnetId: branchSubnet.id,
      positionX: 440,
      positionY: 0,
    },
  });

  await prisma.connection.createMany({
    data: [
      { deviceAId: firewall.id, deviceBId: coreRouter.id, linkType: "copper", portA: "wan1", portB: "gi0/0" },
      { deviceAId: coreRouter.id, deviceBId: coreSwitch.id, linkType: "copper", portA: "gi0/1", portB: "gi1/0/1" },
      { deviceAId: coreSwitch.id, deviceBId: fileServer.id, linkType: "copper", portA: "gi1/0/2", portB: "eth0" },
      { deviceAId: coreSwitch.id, deviceBId: dc.id, linkType: "copper", portA: "gi1/0/3", portB: "eth0" },
      { deviceAId: coreSwitch.id, deviceBId: ws1.id, linkType: "copper", portA: "gi1/0/4", portB: "eth0" },
      { deviceAId: coreSwitch.id, deviceBId: ws2.id, linkType: "copper", portA: "gi1/0/5", portB: "eth0" },
      { deviceAId: coreRouter.id, deviceBId: branchRouter.id, linkType: "fiber", label: "site-to-site VPN" },
    ],
  });

  await prisma.staticIp.createMany({
    data: [
      {
        ipAddress: "10.0.0.10",
        hostname: "Reserved for HA firewall pair",
        assignedTo: "IT Security",
        siteId: hq.id,
        subnetId: coreSubnet.id,
      },
      {
        ipAddress: "10.0.1.100",
        hostname: "Reserved for conference room AV",
        assignedTo: "Facilities",
        siteId: hq.id,
        subnetId: usersSubnet.id,
      },
    ],
  });

  await prisma.ispIp.createMany({
    data: [
      {
        provider: "Comcast Business",
        circuitId: "CB-4471-002",
        ipAddress: "203.0.113.0/29",
        gateway: "203.0.113.1",
        dns: "8.8.8.8, 8.8.4.4",
        siteId: hq.id,
        notes: "Primary internet circuit",
      },
      {
        provider: "AT&T",
        circuitId: "ATT-9982-114",
        ipAddress: "198.51.100.4",
        gateway: "198.51.100.1",
        dns: "1.1.1.1, 1.0.0.1",
        siteId: branch.id,
        notes: "Backup / failover circuit",
      },
    ],
  });

  await prisma.vlan.createMany({
    data: [
      { vlanId: 10, name: "Core / Servers", purpose: "Core network gear and servers", siteId: hq.id },
      { vlanId: 20, name: "User Workstations", purpose: "End-user devices", siteId: hq.id },
      { vlanId: 30, name: "Branch LAN", purpose: "Branch office LAN", siteId: branch.id },
      { vlanId: 99, name: "Management", purpose: "Out-of-band device management", siteId: hq.id },
    ],
  });

  await prisma.vpnTunnel.create({
    data: {
      name: "HQ-Branch Site-to-Site",
      tunnelType: "siteToSite",
      status: "active",
      localEndpoint: "203.0.113.1",
      remoteEndpoint: "198.51.100.1",
      encryption: "IKEv2, AES256-SHA256",
      localSiteId: hq.id,
      remoteSiteId: branch.id,
      deviceId: coreRouter.id,
      notes: "Primary inter-site tunnel",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
