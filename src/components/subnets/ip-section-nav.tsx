import Link from "next/link";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "subnets", href: "/subnets", label: "Subnets" },
  { key: "static-ips", href: "/subnets/static-ips", label: "Static IPs" },
  { key: "isp-ips", href: "/subnets/isp-ips", label: "ISP IPs" },
] as const;

export function IpSectionNav({
  active,
}: {
  active: "subnets" | "static-ips" | "isp-ips";
}) {
  return (
    <div className="flex gap-1 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
