#!/usr/bin/env python3
"""
Network discovery script for NetDoc.

Scans a subnet for live hosts using nmap and writes the results to a CSV
file shaped for NetDoc's device import feature (Devices -> Import).

Requires nmap to be installed:
    macOS:   brew install nmap
    Debian:  sudo apt install nmap
    RHEL:    sudo yum install nmap

Run with sudo/administrator privileges for MAC address + vendor detection
on your local subnet (ARP-based lookups need raw socket access):

    sudo python3 discover.py 10.0.0.0/24 -o discovered.csv

Only scan networks you own or are explicitly authorized to scan.
"""

import argparse
import csv
import re
import subprocess
import sys


def run_nmap(subnet: str) -> str:
    cmd = ["nmap", "-sn", subnet]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, check=True, timeout=600
        )
    except FileNotFoundError:
        print(
            "Error: nmap is not installed. Install it with 'brew install nmap' "
            "(macOS) or 'sudo apt install nmap' (Debian/Ubuntu).",
            file=sys.stderr,
        )
        sys.exit(1)
    except subprocess.CalledProcessError as e:
        print(f"nmap failed:\n{e.stderr}", file=sys.stderr)
        sys.exit(1)
    except subprocess.TimeoutExpired:
        print("nmap timed out after 10 minutes.", file=sys.stderr)
        sys.exit(1)
    return result.stdout


def parse_nmap_output(output: str):
    hosts = []
    current = None
    host_line = re.compile(r"^Nmap scan report for (?:(\S+) \(([\d.]+)\)|([\d.]+))$")
    mac_line = re.compile(r"^MAC Address: ([0-9A-Fa-f:]+) \((.+)\)$")

    for raw_line in output.splitlines():
        line = raw_line.strip()

        m = host_line.match(line)
        if m:
            if current:
                hosts.append(current)
            hostname_with_ip, ip_with_hostname, ip_only = m.groups()
            ip = ip_with_hostname or ip_only
            hostname = hostname_with_ip if ip_with_hostname else ""
            current = {"ip": ip, "hostname": hostname, "mac": "", "vendor": ""}
            continue

        m = mac_line.match(line)
        if m and current:
            current["mac"], current["vendor"] = m.groups()

    if current:
        hosts.append(current)
    return hosts


def main():
    parser = argparse.ArgumentParser(
        description="Discover live hosts on a subnet for NetDoc import"
    )
    parser.add_argument(
        "subnet", help="Subnet/range to scan, e.g. 10.0.0.0/24 or 192.168.1.1-254"
    )
    parser.add_argument(
        "-o", "--output", default="discovered.csv", help="Output CSV path"
    )
    args = parser.parse_args()

    print(f"Scanning {args.subnet} (this can take a minute or two)...")
    output = run_nmap(args.subnet)
    hosts = parse_nmap_output(output)

    if not hosts:
        print(
            "No hosts found. Re-run with sudo for better detection, and make "
            "sure you're on the same network as the subnet you're scanning."
        )
        return

    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["hostname", "ipAddress", "macAddress", "vendor"]
        )
        writer.writeheader()
        for h in hosts:
            writer.writerow(
                {
                    "hostname": h["hostname"] or h["ip"].replace(".", "-"),
                    "ipAddress": h["ip"],
                    "macAddress": h["mac"],
                    "vendor": h["vendor"],
                }
            )

    with_mac = sum(1 for h in hosts if h["mac"])
    print(f"Found {len(hosts)} host(s), {with_mac} with a MAC/vendor match.")
    print(f"Wrote {args.output}")
    print("Import it at /devices/import in NetDoc.")


if __name__ == "__main__":
    main()
