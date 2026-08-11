#!/usr/bin/env bash
# ============================================================================
# network-setup.sh — "my Oracle VM works on localhost but not from the public
# internet" — opens EVERY firewall layer in one run.
# ============================================================================
#
# SysDesignLab runs Express (:4000) behind nginx (:80) on an Oracle Always Free
# VM. When `curl localhost:4000` works ON the box but the site is unreachable
# from your browser, one or more of these layers is closed. This script opens
# all of them, idempotently (safe to re-run):
#
#   1. OCI Security List            (subnet ingress rules)   -> TCP 22/80/443/4000
#   2. OCI Network Security Groups  (VNIC-level, if attached)-> TCP 22/80/443/4000
#   3. Instance OS firewall         (ufw + iptables, via SSH)-> the same ports
#   4. Public IP on the VNIC        (assigned if missing)
#
# then verifies from the outside and prints a per-layer checklist if it still
# fails.
#
# Run it from your Mac (it SSHes into the VM for layer 3):
#
#   bash deploy/network-setup.sh                  # auto-discovers the sysdesignlab VM
#   bash deploy/network-setup.sh --ip 1.2.3.4     # (also) target this public IP
#   bash deploy/network-setup.sh --ports 80,443   # open only these TCP ports
#   bash deploy/network-setup.sh --no-vm-firewall # skip the SSH/ufw step
#   bash deploy/network-setup.sh --no-oci         # skip OCI API (console fallback)
#   bash deploy/network-setup.sh --dry-run        # print, change nothing
#   bash deploy/network-setup.sh --yes            # non-interactive (skip API-key setup)
#
# Needs on the Mac: jq, curl. For layers 1/2/4 it also needs the oci CLI + API
# keys — if missing, the script installs oci and walks you through the one-time
# key setup (~2 minutes). Everything else works without it.
# ============================================================================

set -uo pipefail

# ---------------------------------------------------------------- config ----
INSTANCE_NAME="${INSTANCE_NAME:-sysdesignlab}"
INSTANCE_OCID=""
PUBLIC_IP_ARG=""
PORTS=(22 80 443 4000)
DO_VM_FIREWALL=1
DO_OCI=1
ASSUME_YES=0
DRY_RUN=0
SSH_KEY="${SSH_KEY:-$HOME/.ssh/sysdesignlab}"
REMOTE_USER="${REMOTE_USER:-ubuntu}"

info() { printf '\n==> %s\n' "$*"; }
ok()   { printf '    ✓ %s\n' "$*"; }
warn() { printf '    ! %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
is_dry_run() { [ "$DRY_RUN" -eq 1 ]; }

usage() {
  sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
}

while [ $# -gt 0 ]; do
  case "$1" in
    --instance)       INSTANCE_OCID="${2:-}"; shift 2 ;;
    --ip)             PUBLIC_IP_ARG="${2:-}"; shift 2 ;;
    --ports)          IFS=',' read -r -a PORTS <<< "${2:-}"; shift 2 ;;
    --no-vm-firewall) DO_VM_FIREWALL=0; shift ;;
    --no-oci)         DO_OCI=0; shift ;;
    --yes)            ASSUME_YES=1; shift ;;
    --dry-run)        DRY_RUN=1; shift ;;
    -h|--help)        usage ;;
    *) die "unknown option: $1 (run with --help)" ;;
  esac
done
[ "${#PORTS[@]}" -gt 0 ] || PORTS=(22 80 443 4000)
for p in "${PORTS[@]}"; do
  case "$p" in (*[!0-9]*|'') die "invalid port in --ports: '$p'" ;; esac
done

# ----------------------------------------------------------- prereqs --------
ensure_prereqs() {
  command -v jq   >/dev/null 2>&1 || die "jq is required — install it:  brew install jq"
  command -v curl >/dev/null 2>&1 || die "curl is required"
}

ensure_oci_cli() {
  # Already on PATH?
  if ! command -v oci >/dev/null 2>&1; then
    # Installed but not on PATH? (e.g. pipx/installer puts it in ~/.local/bin)
    for d in "$HOME/bin" "$HOME/.local/bin"; do
      [ -x "$d/oci" ] && { PATH="$d:$PATH"; export PATH; command -v oci >/dev/null 2>&1 && break; }
    done
  fi
  command -v oci >/dev/null 2>&1 && return 0
  info "oci CLI not found — installing it (user-space, no sudo)."
  is_dry_run && { echo "    [dry-run] install the oci CLI"; return 1; }
  curl -fsSL https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh \
    | bash -s -- --accept-all-defaults >/dev/null 2>&1 || true
  for d in "$HOME/bin" "$HOME/.local/bin"; do
    [ -x "$d/oci" ] && { PATH="$d:$PATH"; export PATH; break; }
  done
  command -v oci >/dev/null 2>&1 || {
    warn "oci CLI installed but not on PATH — open a NEW terminal and re-run this script."
    return 1
  }
  ok "oci CLI $(oci --version)"
}

ensure_oci_config() {
  [ -f "$HOME/.oci/config" ] && return 0
  info "No OCI API credentials at ~/.oci/config."
  if [ "$ASSUME_YES" -eq 1 ] || [ "$DO_OCI" -eq 0 ] || [ ! -t 0 ]; then
    warn "Skipping API-key setup (--yes / --no-oci / no terminal). The cloud-firewall half"
    warn "will be skipped — run this script interactively once to set it up, or follow the"
    warn "console steps printed below."
    return 1
  fi

  mkdir -p "$HOME/.oci"
  if [ ! -f "$HOME/.oci/oci_api_key.pem" ]; then
    echo "  Generating an OCI API key pair (RSA 2048)…"
    # 'N/A' answers the passphrase prompt (no passphrase); it asks twice.
    printf 'N/A\nN/A\n' | oci setup keys --output-dir "$HOME/.oci" --key-name oci_api_key --overwrite \
      >/dev/null 2>&1 || { warn "'oci setup keys' failed — run it manually:  oci setup keys"; return 1; }
  fi
  PUB="$HOME/.oci/oci_api_key_public.pem"
  [ -f "$PUB" ] || { warn "public key not found at $PUB"; return 1; }

  echo
  echo "  One-time OCI API-key setup (takes ~2 minutes):"
  echo "    1. Console  https://cloud.oracle.com  ->  profile icon  ->  My profile"
  echo "    2. API Keys  ->  Add API Key  ->  Paste the PUBLIC key below  ->  Add"
  echo "    3. Copy the FINGERPRINT that appears after you Add."
  echo
  echo "  ----- paste the whole block below into the console -----"
  cat "$PUB"
  echo "  --------------------------------------------------------"
  echo
  read -r -p "  User OCID (ocid1.user.oc1…): "   USER_OCID
  read -r -p "  Tenancy OCID (ocid1.tenancy…): " TENANCY_OCID
  read -r -p "  Region (e.g. ap-mumbai-1): "       REGION
  read -r -p "  Fingerprint (aa:bb:…): "           FINGERPRINT
  [ -n "$USER_OCID$TENANCY_OCID$REGION$FINGERPRINT" ] \
    || { warn "all four values are required — re-run to retry."; return 1; }

  umask 077
  cat > "$HOME/.oci/config" <<EOF
[DEFAULT]
user=$USER_OCID
tenancy=$TENANCY_OCID
region=$REGION
fingerprint=$FINGERPRINT
key_file=$HOME/.oci/oci_api_key.pem
EOF
  ok "Wrote $HOME/.oci/config"
  if oci os ns get >/dev/null 2>&1; then
    ok "OCI authentication works."
    return 0
  fi
  warn "OCI authentication failed — re-check the OCIDs / fingerprint / region, then re-run."
  return 1
}

# --------------------------------------------------- OCI network helpers ----
# Build the desired ingress rules (TCP from 0.0.0.0/0) for ${PORTS[@]}.
build_desired_rules() {
  local arr='[]' p
  for p in "${PORTS[@]}"; do
    arr="$(jq -n --argjson a "$arr" --argjson p "$p" '
      $a + [ {
        "source": "0.0.0.0/0",
        "protocol": "6",
        "description": "SysDesignLab tcp/\($p) from internet",
        "isStateless": false,
        "tcpOptions": { "destinationPortRange": { "min": $p, "max": $p } }
      } ]')"
  done
  printf '%s' "$arr"
}

# NSG rules are explicit-direction objects — the add payload requires "direction".
build_desired_nsg_rules() {
  local arr='[]' p
  for p in "${PORTS[@]}"; do
    arr="$(jq -n --argjson a "$arr" --argjson p "$p" '
      $a + [ {
        "direction": "INGRESS",
        "source": "0.0.0.0/0",
        "protocol": "6",
        "description": "SysDesignLab tcp/\($p) from internet",
        "isStateless": false,
        "tcpOptions": { "destinationPortRange": { "min": $p, "max": $p } }
      } ]')"
  done
  printf '%s' "$arr"
}

# Given existing rules (security-list shape OR nsg-list shape) and desired
# rules, print the desired rules that are NOT already present.
# Existing nsg-list rules use hyphenated keys ("tcp-options"); security-list
# and add-payloads use camelCase ("tcpOptions") — the key() normalizes both.
rules_to_add() {
  jq -n --argjson ex "$1" --argjson de "$2" '
    def ports:
      if .tcpOptions.destinationPortRange then
        [.tcpOptions.destinationPortRange.min, .tcpOptions.destinationPortRange.max]
      else
        [."tcp-options"."destination-port-range".min, ."tcp-options"."destination-port-range".max]
      end;
    def rk:
      ((.source // "")|tostring) + "|" + ((.protocol // "")|tostring) + "|" +
      (((.tcpOptions.destinationPortRange.min // ."tcp-options"."destination-port-range".min // "-")|tostring)) + "-" +
      (((.tcpOptions.destinationPortRange.max // ."tcp-options"."destination-port-range".max // "-")|tostring));
    ($ex | map(rk)) as $have
    | [ $de[] | select( rk as $k | ($have | index($k)) == null ) ]
  '
}

find_instance_ocid() {
  local tenancy comp ocid
  tenancy="$(sed -n 's/^tenancy=//p' "$HOME/.oci/config" 2>/dev/null | head -1)"
  [ -n "$tenancy" ] || return 1
  for comp in "$tenancy" $(oci iam compartment list -c "$tenancy" --all --access-level ACCESSIBLE --query 'data[].id' --raw-output 2>/dev/null || true); do
    [ -n "$comp" ] || continue
    # Fetch the whole array and filter with jq (avoids JMESPath filter quoting).
    ocid="$(oci compute instance list -c "$comp" --all --query 'data' --raw-output 2>/dev/null \
      | jq -r --arg name "$INSTANCE_NAME" \
        '.[] | select(."display-name"==$name and ."lifecycle-state"=="RUNNING") | .id' \
      2>/dev/null | head -1 || true)"
    [ -n "$ocid" ] && { echo "$ocid"; return 0; }
  done
  return 1
}

# Resolve compartment / VNIC / subnet / VCN / security list / public IP / NSGs.
resolve_network() {
  if [ -z "$INSTANCE_OCID" ]; then
    info "Finding a RUNNING instance named '$INSTANCE_NAME'…"
    INSTANCE_OCID="$(find_instance_ocid || true)"
    [ -n "$INSTANCE_OCID" ] || {
      warn "No RUNNING instance named '$INSTANCE_NAME' was found in any compartment."
      warn "Pass --instance <OCID> or --ip <PUBLIC_IP> instead."
      return 1
    }
    ok "Instance: $INSTANCE_OCID"
  fi

  COMPARTMENT="$(oci compute instance get --instance-id "$INSTANCE_OCID" --query 'data."compartment-id"' --raw-output 2>/dev/null || true)"
  [ -n "$COMPARTMENT" ] || { warn "could not resolve the instance compartment."; return 1; }

  # Prefer the primary VNIC (an instance can have several); fall back to the first.
  VNIC_JSON="$(oci compute instance list-vnics --instance-id "$INSTANCE_OCID" --query 'data' --raw-output 2>/dev/null \
    | jq -c 'map(select(."is-primary"))[0] // .[0]' 2>/dev/null || true)"
  VNIC_ID="$(jq -r '.id // empty' <<<"$VNIC_JSON" 2>/dev/null)"
  SUBNET_ID="$(jq -r '."subnet-id" // empty' <<<"$VNIC_JSON" 2>/dev/null)"
  [ -n "$VNIC_ID" ] && [ -n "$SUBNET_ID" ] || { warn "could not read the instance's VNIC."; return 1; }

  VCN_ID="$(oci network subnet get --subnet-id "$SUBNET_ID" --query 'data."vcn-id"' --raw-output 2>/dev/null || true)"
  [ -n "$VCN_ID" ] || { warn "could not resolve the VCN."; return 1; }

  # A subnet can reference MORE than one security list — open every one of them.
  SL_IDS=()
  while IFS= read -r _sl; do [ -n "$_sl" ] && SL_IDS+=("$_sl"); done \
    < <(oci network subnet get --subnet-id "$SUBNET_ID" --query 'data."security-list-ids"[]' --raw-output 2>/dev/null || true)
  [ "${#SL_IDS[@]}" -gt 0 ] || { warn "no security list found for the subnet."; return 1; }

  if [ -n "$PUBLIC_IP_ARG" ]; then
    PUBLIC_IP="$PUBLIC_IP_ARG"
  else
    PUBLIC_IP="$(jq -r '."public-ip" // empty' <<<"$VNIC_JSON" 2>/dev/null)"
  fi

  NSG_IDS=()
  while IFS= read -r _n; do [ -n "$_n" ] && NSG_IDS+=("$_n"); done \
    < <(jq -r '."nsg-ids"[]?' <<<"$VNIC_JSON" 2>/dev/null || true)

  ok "VCN $VCN_ID  ·  subnet $SUBNET_ID  ·  security list(s): ${SL_IDS[*]}"
  [ -n "$PUBLIC_IP" ] && ok "Public IP: $PUBLIC_IP" || warn "No public IP assigned yet."
  return 0
}

open_one_security_list() {
  local sl="$1" current desired add merged egress
  current="$(oci network security-list get --security-list-id "$sl" --query 'data."ingress-security-rules"' --raw-output 2>/dev/null || echo '[]')"
  [ "$current" = "null" ] && current='[]'
  current="${current:-[]}"
  egress="$(oci network security-list get --security-list-id "$sl" --query 'data."egress-security-rules"' --raw-output 2>/dev/null || echo '[]')"
  [ "$egress" = "null" ] && egress='[]'
  egress="${egress:-[]}"
  desired="$(build_desired_rules)"
  add="$(rules_to_add "$current" "$desired")"
  [ "$add" = "[]" ] && { ok "Security list $sl already allows those ports."; return 0; }
  merged="$(jq -n --argjson a "$current" --argjson b "$add" '$a + $b')"
  echo "$merged" > "$TMPDIR/ingress.new.json"
  echo "$egress" > "$TMPDIR/egress.json"

  if is_dry_run; then
    echo "    [dry-run] would add to security list $sl:"
    jq -c '.[].description' "$TMPDIR/ingress.new.json" 2>/dev/null | sed 's/^/      + /'
    return 0
  fi
  if oci network security-list update --security-list-id "$sl" \
        --ingress-security-rules "file://$TMPDIR/ingress.new.json" \
        --egress-security-rules "file://$TMPDIR/egress.json" --force >/dev/null 2>&1; then
    ok "Security list updated: TCP ${PORTS[*]} now open."
  else
    warn "security-list update FAILED on $sl — your API key's user needs permission to"
    warn "manage security lists, or run the console steps at the bottom of this run."
  fi
}

open_security_list() {
  info "Security list(s) — opening TCP ${PORTS[*]} from 0.0.0.0/0 (merges, keeps existing rules)."
  local sl
  for sl in "${SL_IDS[@]}"; do
    [ -n "$sl" ] || continue
    open_one_security_list "$sl"
  done
}

open_nsgs() {
  if [ "${#NSG_IDS[@]}" -eq 0 ]; then
    info "No Network Security Groups attached to the VNIC — layer already open."
    return 0
  fi
  info "Network Security Groups ${NSG_IDS[*]} — opening TCP ${PORTS[*]} (additive)."
  local desired add existing
  desired="$(build_desired_nsg_rules)"
  for nsg in "${NSG_IDS[@]}"; do
    [ -n "$nsg" ] || continue
    existing="$(oci network nsg rules list --nsg-id "$nsg" --direction INGRESS --query 'data' --raw-output 2>/dev/null || echo '[]')"
    [ "$existing" = "null" ] && existing='[]'
    add="$(rules_to_add "$existing" "$desired")"
    if [ "$add" = "[]" ]; then
      ok "NSG $nsg already allows those ports."
      continue
    fi
    echo "$add" > "$TMPDIR/nsg.json"
    if is_dry_run; then
      echo "    [dry-run] would add rules to NSG $nsg"
      continue
    fi
    if oci network nsg rules add --nsg-id "$nsg" --security-rules "file://$TMPDIR/nsg.json" >/dev/null 2>&1; then
      ok "NSG $nsg updated."
    else
      warn "NSG update FAILED for $nsg — check permissions, or add rules in the console."
    fi
  done
}

ensure_public_ip() {
  [ -n "$PUBLIC_IP" ] && return 0
  info "The instance has no public IP — assigning an ephemeral one."
  local priv
  priv="$(oci network private-ip list --vnic-id "$VNIC_ID" --query 'data[0].id' --raw-output 2>/dev/null || true)"
  [ -n "$priv" ] || { warn "could not find the private IP to attach a public IP to."; return 1; }
  if is_dry_run; then
    echo "    [dry-run] would create an ephemeral public IP on $priv"
    return 1
  fi
  PUBLIC_IP="$(oci network public-ip create --compartment-id "$COMPARTMENT" --lifetime EPHEMERAL \
    --private-ip-id "$priv" --query 'data."ip-address"' --raw-output 2>/dev/null || true)"
  [ -n "$PUBLIC_IP" ] && ok "Assigned public IP: $PUBLIC_IP" \
    || warn "public-IP assignment failed — assign one in the console (Instance -> Attached VNICs)."
}

# ------------------------------------------------------------ VM (OS) firewall
vm_open_firewall() {
  local ip="$1"
  if [ ! -f "$SSH_KEY" ]; then
    warn "No SSH key at $SSH_KEY — skipping the OS firewall. On the VM run:"
    echo "    sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp"
    echo "    sudo ufw allow 4000/tcp && sudo ufw --force enable"
    return 0
  fi
  info "Opening the instance OS firewall (ufw/iptables) on $REMOTE_USER@$ip via SSH…"
  if is_dry_run; then
    echo "    [dry-run] ssh $REMOTE_USER@$ip 'sudo bash -s'  ports: ${PORTS[*]}"
    return 0
  fi
  ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 \
      "$REMOTE_USER@$ip" "sudo bash -s" "${PORTS[@]}" <<'REMOTE'
set -u
for p in "$@"; do
  case "$p" in (*[!0-9]*|'') continue ;; esac
  command -v ufw >/dev/null 2>&1 && { ufw allow "$p/tcp" >/dev/null 2>&1 || true; }
  iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null \
    || iptables -I INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || true
done
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: inactive'; then
  echo "  enabling ufw (SSH was allowed first, so you won't be locked out)"
  ufw --force enable >/dev/null 2>&1 || true
fi
command -v netfilter-persistent >/dev/null 2>&1 && netfilter-persistent save >/dev/null 2>&1 || true
echo "  listeners:"
ss -tlnp 2>/dev/null | grep -E ':(22|80|4000)\b' || echo "    (none of 22/80/4000 listening?)"
echo "  services:"
systemctl is-active sysdesignlab nginx 2>/dev/null || true
REMOTE
}

# ------------------------------------------------------------ verification ---
verify_reachable() {
  local ip="$1" code
  info "Verifying from the internet:  http://$ip/"
  # curl prints "000" itself on a failed connect; don't double it with || echo.
  code="$(curl -sS -o /dev/null -m 12 -w '%{http_code}' "http://$ip/" 2>/dev/null || true)"
  [ -n "$code" ] || code=000
  case "$code" in
    200|301|302|307|308)
      ok "http://$ip/  ->  HTTP $code  — reachable from the public internet. ✓"
      return 0 ;;
  esac
  warn "http://$ip/  ->  HTTP $code  (still not reachable from the internet)."
  cat <<'EOF'
Diagnostic checklist (firewall layers, in order):

  1. Security list       OCI console ▸ Networking ▸ VCN ▸ Security Lists ▸ Default
                         Ingress Rules: TCP 22, 80, 443 from 0.0.0.0/0
     oci check:  oci network security-list list -c <compartment> --vcn-id <vcn>
  2. NSG (if attached)   Instance ▸ Attached VNICs ▸ <vnic> ▸ Network security groups
     oci check:  oci network nsg rules list --nsg-id <nsg-id>
  3. OS firewall         On the VM:  sudo ufw status ;  sudo iptables -L INPUT -n
  4. Public IP           The instance page must show a public IP.
  5. App listening       On the VM:  ss -tlnp | grep -E ':(80|4000)' ;
                         systemctl status sysdesignlab nginx
EOF
  return 1
}

console_fallback() {
  cat <<'EOF'

OCI API keys aren't configured, so I can't edit the cloud firewall from here.
Do it in the console (about 2 minutes), then re-run this script:

  1) Security List ingress rules
     Networking ▸ Virtual cloud networks ▸ <your VCN> ▸ Security Lists ▸ Default
     ▸ Add Ingress Rules — source 0.0.0.0/0, TCP:  22, 80, 443   (+ 4000 to test directly)

  2) Network Security Groups (only if the instance's VNIC is in any)
     Compute ▸ Instances ▸ <instance> ▸ Attached VNICs ▸ <VNIC> ▸ Network security groups
     ▸ add the same ingress rules

  Re-run this script afterwards — it still opens the OS firewall and verifies.
EOF
}

# ------------------------------------------------------------------- main ----
main() {
  ensure_prereqs
  TMPDIR="$(mktemp -d)"
  trap 'rm -rf "$TMPDIR"' EXIT

  info "SysDesignLab · Oracle network setup"
  echo "    ports to open: ${PORTS[*]}"

  OCI_READY=0
  if [ "$DO_OCI" -eq 1 ]; then
    if ensure_oci_cli; then
      if ensure_oci_config; then OCI_READY=1; fi
    fi
  fi

  PUBLIC_IP="$PUBLIC_IP_ARG"
  NSG_IDS=()
  SL_IDS=()

  if [ "$OCI_READY" -eq 1 ]; then
    if resolve_network; then
      open_security_list
      open_nsgs
      ensure_public_ip || true
    else
      warn "Could not resolve the instance over the OCI API — falling back to VM-only mode."
      console_fallback
    fi
  else
    console_fallback
  fi

  if [ "$DO_VM_FIREWALL" -eq 1 ]; then
    if [ -n "$PUBLIC_IP" ]; then
      vm_open_firewall "$PUBLIC_IP"
    else
      warn "No public IP known — skipping the OS-firewall step."
      warn "Re-run with:  bash deploy/network-setup.sh --ip <PUBLIC_IP>   (the IP you SSH to)"
    fi
  fi

  [ -n "$PUBLIC_IP" ] \
    || die "Cannot verify without a public IP. Re-run with:  bash deploy/network-setup.sh --ip <PUBLIC_IP>"

  if verify_reachable "$PUBLIC_IP"; then
    echo
    ok "Done.  http://$PUBLIC_IP/"
  else
    warn "Still not reachable — work through the checklist above, fix the closed layer, then re-run."
    exit 1
  fi
}
main "$@"
