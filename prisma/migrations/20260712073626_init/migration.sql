-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('router', 'switch', 'firewall', 'server', 'workstation', 'accessPoint', 'printer', 'other');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('active', 'inactive', 'maintenance');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('copper', 'fiber', 'wifi');

-- CreateEnum
CREATE TYPE "VpnTunnelType" AS ENUM ('siteToSite', 'remoteAccess', 'other');

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vlan" (
    "id" TEXT NOT NULL,
    "vlanId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,

    CONSTRAINT "Vlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VpnTunnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tunnelType" "VpnTunnelType" NOT NULL DEFAULT 'siteToSite',
    "status" "DeviceStatus" NOT NULL DEFAULT 'active',
    "localEndpoint" TEXT,
    "remoteEndpoint" TEXT,
    "encryption" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "localSiteId" TEXT,
    "remoteSiteId" TEXT,
    "deviceId" TEXT,

    CONSTRAINT "VpnTunnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subnet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cidr" TEXT NOT NULL,
    "vlanId" INTEGER,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,

    CONSTRAINT "Subnet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticIp" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "hostname" TEXT,
    "macAddress" TEXT,
    "assignedTo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,
    "subnetId" TEXT,

    CONSTRAINT "StaticIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IspIp" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "circuitId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "gateway" TEXT,
    "dns" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,

    CONSTRAINT "IspIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "type" "DeviceType" NOT NULL DEFAULT 'other',
    "vendor" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "os" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'active',
    "owner" TEXT,
    "notes" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT,
    "subnetId" TEXT,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "portA" TEXT,
    "portB" TEXT,
    "linkType" "LinkType" NOT NULL DEFAULT 'copper',
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceAId" TEXT NOT NULL,
    "deviceBId" TEXT NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vlan_siteId_vlanId_key" ON "Vlan"("siteId", "vlanId");

-- AddForeignKey
ALTER TABLE "Vlan" ADD CONSTRAINT "Vlan_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpnTunnel" ADD CONSTRAINT "VpnTunnel_localSiteId_fkey" FOREIGN KEY ("localSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpnTunnel" ADD CONSTRAINT "VpnTunnel_remoteSiteId_fkey" FOREIGN KEY ("remoteSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VpnTunnel" ADD CONSTRAINT "VpnTunnel_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subnet" ADD CONSTRAINT "Subnet_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticIp" ADD CONSTRAINT "StaticIp_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticIp" ADD CONSTRAINT "StaticIp_subnetId_fkey" FOREIGN KEY ("subnetId") REFERENCES "Subnet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IspIp" ADD CONSTRAINT "IspIp_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_subnetId_fkey" FOREIGN KEY ("subnetId") REFERENCES "Subnet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_deviceAId_fkey" FOREIGN KEY ("deviceAId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_deviceBId_fkey" FOREIGN KEY ("deviceBId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
