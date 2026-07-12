-- CreateTable
CREATE TABLE "Vlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vlanId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "siteId" TEXT,
    CONSTRAINT "Vlan_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VpnTunnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "tunnelType" TEXT NOT NULL DEFAULT 'siteToSite',
    "status" TEXT NOT NULL DEFAULT 'active',
    "localEndpoint" TEXT,
    "remoteEndpoint" TEXT,
    "encryption" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "localSiteId" TEXT,
    "remoteSiteId" TEXT,
    "deviceId" TEXT,
    CONSTRAINT "VpnTunnel_localSiteId_fkey" FOREIGN KEY ("localSiteId") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VpnTunnel_remoteSiteId_fkey" FOREIGN KEY ("remoteSiteId") REFERENCES "Site" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VpnTunnel_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Vlan_siteId_vlanId_key" ON "Vlan"("siteId", "vlanId");
