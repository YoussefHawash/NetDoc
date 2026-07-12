import {
  Router,
  Network,
  ShieldAlert,
  Server,
  Monitor,
  Wifi,
  Printer,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import { DeviceType } from "@/generated/prisma/enums";

export const deviceTypeIcons: Record<DeviceType, LucideIcon> = {
  router: Router,
  switch: Network,
  firewall: ShieldAlert,
  server: Server,
  workstation: Monitor,
  accessPoint: Wifi,
  printer: Printer,
  other: HelpCircle,
};

export const deviceTypeLabels: Record<DeviceType, string> = {
  router: "Router",
  switch: "Switch",
  firewall: "Firewall",
  server: "Server",
  workstation: "Workstation",
  accessPoint: "Access Point",
  printer: "Printer",
  other: "Other",
};
