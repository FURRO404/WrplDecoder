"use strict";
// Decode War Thunder replays (.wrpl): container, packet framing, MPI header, field tables, events.

// Fixed 1234-byte packed header: [offset, type, name]; cN = char[N].
const HEADER = [[0, "u32", "header"], [4, "u32", "magic"], [8, "c128", "level_path"], [136, "c260", "mission_file"],
  [396, "c128", "mission_name"], [524, "c128", "environment"], [652, "c32", "weather"], [684, "u32", "footer_blk_offset"],
  [688, "u64", "difficulty_part_1"], [696, "u64", "difficulty_part_2"], [704, "c20", "unk0"], [724, "u32", "session_type"],
  [728, "u32", "player_count"], [732, "u64", "session_id"], [740, "u8", "replay_part_number"], [741, "u8", "unk1"],
  [742, "u16", "segment_length_sec"], [744, "u32", "skies_random_seed"], [748, "u16", "settings_blk_size"],
  [750, "c29", "unk3"], [779, "bool", "is_world_war"], [780, "c128", "location_name"], [908, "u32", "start_time"],
  [912, "u32", "time_limit"], [916, "u32", "score_limit"], [920, "u32", "kill_limit"], [924, "u32", "game_type"],
  [928, "u32", "restore_type"], [932, "i32", "player_no"], [936, "u32", "unk4"], [940, "u32", "num_attempts"],
  [944, "u32", "max_attempts"], [948, "bool", "is_attempts"], [949, "bool", "is_limited_ammo"],
  [950, "bool", "is_limited_fuel"], [951, "c13", "unk5"], [964, "u32", "game_mode"], [968, "c128", "chapter_name"],
  [1096, "c128", "battle_kill_streak"], [1224, "u16", "snapshot_period_sec"], [1226, "u64", "game_version"]];
const HEADER_SIZE = 1234;
const PACKET_TYPES = {0: "EndMarker", 1: "StartMarker", 2: "AircraftSmall", 3: "Chat", 4: "MPI", 5: "NextSegment",
  6: "ECS", 7: "Snapshot", 8: "ReplayHeaderInfo"};
const pairs = s => s.trim().split(/\s+/).flatMap((x, i, a) => i % 2 ? [] : [[x, a[i + 1]]]);
const MPI_NAMES = Object.fromEntries(pairs(`
B00C InfTroopSync B00E ReplicatedObjectCreate B013 DoFlakExplosion B01D SemChangeAircraftRequest
B01E PpChangeAircraftResponse B02C SetTimeSpeedEx B062 SpectateRequestId B063 ControlsConfirmation
B065 FmwControlsPacket B066 FmwAuthorityApprovedState B068 MissionEvent B06E UnitBulletHitPartCount
B07B MissionProgressDataReceived B07D MissionProgressTimeDataReceived B08B VehicleControlsPacket
B08C VehicleAuthorityApprovedState B091 AppUnitVersionMismatch B092 AppUnitVersionMatch B095
GmDesyncStats B097 GmDoEscape B0A8 UnitDesyncData B0C5 UnitRequestWinch B0CE WalkerControlsPacket
B0D1 ResponseChallenge B0D3 ShowUpObjToTeamResponse B0D4 ShowUpObjToTeamRequest B0DC
RocketControlsPacket B0E5 ConfirmAuthorityApprovedState B0F5 UnitHighlight B107 EACClientToServerMsg
B11D CloudsTracesData B12E TerraformIntegrityCheckDataRequest B145 HumanControlsPacket D01F
PlayFlakExplosionVisual D020 GmSetGunAngles D039 DeferredReplicatedObjectCreate D043
ReplayCameraParams D046 UnitReloadGun D047 FmwRpm D04A ReplayCockpitParams D08E PlayExplosionVisual
D0AD UnitDelayedStatusChange D0FE ProjectileHitReplay D136 DeferredReflectionData D137
UnitDataSnapshot D146 ReplayVrHandsState F016 GmGroundExplosionSmokeEffect F017
GmGroundExplosionFireEffect F018 GmDoInactive F01A GmDoSingleShotReliable F01B GmDoStartFire F01C
GmDoStopFire F026 TurretYawImmobile F027 TurretPitchImmobile F028 RunTriggerAction F02D
ReflectionData F02F UnitRequestRespawn F032 UnitRequestRepair F033 UnitRepair F037 UnitDetected F038
OwnerPlayerViewDirection F03B HintPlayFromScript F04B OnUnitDead F04D UnitDoExplosion F050
UnitBailoutResponse F053 UnitRequestRearm F054 UnitRearm F055 MissionFailOrSuccess F056
TextCriticalHitReport F058 TextKillReport F05D FadeToDebriefing F06A DialogMessageAction F06B
ResetGroundModelPositionDeltas F071 UnitReloadGuns F073 GroundModelPositions F074
GroundModelPositionsServerReplay F078 TextStreak F07A MissionProgressData F07C
MissionProgressTimeData F08D FmwAuthorityApprovedPartialState F08F UnitAttachEffectRelative F091
GmCutPartResponse F099 PlayLandcrashExplosions F09A DvmUnreliableHpReflectionData F09B
DvmUnreliableHpReflectionReply F09C EconUpdateWeapon F0A0 GmDoSingleShotUnreliable F0A3
VehicleAuthorityApprovedPartialState F0A6 UnitArtilleryShootingAtPos F0AA RedundancyReflectionData
F0AB DvmCutDecor F0B1 UnitSingleShot F0B3 DebugSphere F0B6 SmartCutsceneFinished F0B8
PlayAreaEffects F0BB UnitRequestDamageModelEvents F0BC UnitResponseDamageModelEvents F0BD
UnitBulletRearm F0C2 UnitLastEffectiveHit F0C3 MessageStartGame F0C8 UseOrderRequest F0CA
UnitRequestRepairAssist F0CB DvmDamageDataForReferee F0CC UnitCameraAngles F0D2 OrderResult F0D5
UnitToggleGunners F0D6 GmDoStartFireWithDist F0D8 HudMarkMapSquare F0DB ShellsData F0DD
GmRequestToggleCurWeapon F0DF CustomWeatherParams F0E1 GmRequestChangeCrew F0E2 GmRequestRepair F0E3
RocketAuthorityApprovedState F0E6 GmApplyExplosionImpulse F0E9 UnitHitEffects F0EC MissionPlayHint
F0ED UnitPickupItem F0F0 UnitSetTimeFuseDistance F0F6 UnitScoutResult F0F7
InteractiveObjectAuthorityApprovedState F0F8 InteractiveObjectAuthorityApprovedPartialState F0F9
UnitRefuel F0FD UnitRequestChangeShotFreq F101 UnitRequestRepairWithoutMod F103 ConsoleUnitCommand
F104 TextHitReport F109 GmEngineOnOff F10A UnitChangeNightVision F10C RecreateTorpedoes F10F
SquadTargetDesignationRequest F117 UnitOnEffectiveHit F118 UnitDamagePartKill F119 GmToggleOptics
F11A ShellsDataServerReplay F11E UnitRequestSwitchOnSupport F11F GmRequestToggleStealth F120
UnitFriendlyFire F121 ActiveProtectionSystemTriggering F122 TerraformPatchAlt F123 TerraformData
F124 GmToggleTerraform F125 GmDoWeaponLockOnReliable F126 GmDoWeaponLockOnUnreliable F127
UnitRequestExtinguishAssist F128 UnitRequestExtinguishWithoutMod F129 UnitResponseSwitchOnSupport
F12C ECSNetUnitsData F12D ECSNetUnitsDataServerReplay F12F TerraformIntegrityCheckDataResponce F130
UnitSmokeScreen F131 UnitChangeCurShortcut F132 ShotFailedApsWorking F133 UnitOnExplosion F134
UnitRequestChangeSupportPlane F135 UnitSupportPlaneAttackCommand F13B DvmDamageDataForReplay F13C
UnitOnEffectiveCritHit F13D GmCutAllWreckedParts F140 UnitRequestUnlimitedControl F142
TargetDesignationMark F143 SetBenchmarkMode F144 UnitOnHit F147 UnitDoProximityExplosion F148
ForceMusic F157 SevereDamage F15F UnitHitAnalysis`).map(([k, v]) => [parseInt(k, 16), v]));
// oid >> 11 picks the object kind, oid & 0x7FF the index; index 0x7FF means a varint ext uid follows.
const OBJECTS = {0: "FMW", 1: "GM", 2: "INF", 5: "Zone", 8: "MissionObjective", 11: "Global", 12: "FM_FX", 13: "UFX",
  14: "Player", 15: "Team", 16: "FM_DVM", 17: "GM_DVM", 18: "CUD", 22: "MissionArea", 25: "WEAP"};
const GLOBALS = {2: "main_dispatch", 3: "local_client", 4: "gen_state", 8: "glob_elo"};
// Replication class ids: the engine's replicated classes sorted by name.
const CLASSES = `Airfield BombingZone CaptureZone DMSquad ExitZone FlightModelWrap IGroundModel InfantryTroop
  InteractiveObject InteractiveObjectProxy MissionArea MissionDrawing MissionObjective MissionZone ObjectsGroup
  OrderPlayerProgress PickupZone RaceMode RearmZone RespawnBase Squadron UnitWinch Waypoint Wing`.split(/\s+/);
const SPAWN = {5: "aircraft", 6: "ground vehicle", 7: "infantry"};
// key kind sync label; key Tn = packet type n, else the MPI message id.
const EVENTS = Object.fromEntries(`
T0 marker - End of replay|T1 marker - Start marker|T2 sync s Aircraft state|T3 chat - Chat|T5 marker - Next part
T6 ecs - Entity data (ECS)|T7 marker - Snapshot|T8 marker - ECS message hashes
D039 object - Object created|B00E object - Object created|F058 kill - Kill|F04B kill - Unit dead
F056 damage - Critical damage|F157 damage - Severe damage|F118 damage - Part damaged (hit marker)
F078 award - Award / streak|F037 detect - Unit detected (spotted)
F01B shot - Ground unit starts firing|F01C shot - Ground unit stops firing|F0B1 shot - Single shot
F0BD shot - Bullet rearm|F0E9 hit - Hit effects|F117 hit - Effective hit|F13C hit - Effective critical hit
F144 hit - Hit|F15F hit - Hit analysis|F133 hit - Explosion at unit|F0C2 hit - Last effective hit
D04A sync s Cockpit instruments|D043 sync s Replay camera|F0CC sync s Camera angles (tank camera)
D047 sync s Engine RPM|F073 sync s Ground unit positions|F074 sync s Ground unit positions
F0DB sync s Shells / weapon sync|F11A sync s Shells / weapon sync|F02D sync s Reflection data (state sync)
D136 sync s Reflection data (state sync)|F0AA sync s Reflection data (state sync)|F09A sync s Damage model HP sync
F028 mission - Mission trigger action|F0C3 mission - Game start|F05D mission - Battle end (debriefing)
F055 mission - Mission success / fail|F07A mission - Mission progress|F07C mission - Mission progress (time)
F050 other - Bailout|F033 other - Repair|D046 other - Gun reload|F0DF other - Weather`.trim().split(/[|\n]/)
  .map(e => { const [k, kind, sync, ...l] = e.split(" "); return [k, [l.join(" "), kind, sync === "s"]]; }));
const KINDS = "spawn object kill damage hit shot detect chat award mission marker ecs other sync unknown".split(" ");
// Detail text per event, filled from the packet's annotation values (annotations.json).
const DETAILS = {T5: "-> {next_part:04}.wrpl", F058: "{killer_uid} ({killer_vehicle}) killed {victim_uid}, weapon {weapon}",
  F056: "{victim_uid} ({vehicle}) by {attacker_uid}", F157: "{victim_uid} ({vehicle}) by {attacker_uid}",
  F078: "{award}, player slot {player_slot}", F037: "{spotter_uid} spotted {spotted_uid}", F118: "target {target_uid}"};
const SIZES = {u8: 8, i8: 8, bool: 8, u16: 16, i16: 16, uid: 16, u32: 32, i32: 32, f32: 32, u64: 64, i64: 64, f64: 64, vec3f: 96};
const hex4 = n => n.toString(16).toUpperCase().padStart(4, "0");
const utf8 = new TextDecoder();

// danet ReadCompressed: 7-bit groups, low first. Returns [value, next pos].
function varint(b, pos, end) {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    if (pos >= end) return [null, pos];
    const c = b[pos++];
    v += (c & 0x7F) * 2 ** (7 * i);
    if (!(c & 0x80)) break;
  }
  return [v, pos];
}

// danet ReadBits: MSB-first; whole bytes land little-endian, a trailing partial byte right-aligned.
function rawBits(b, bp, n) {
  const out = [];
  for (; n > 0; n -= 8, bp += 8) {
    const i = bp >> 3, m = bp & 7;
    let v = i < b.length ? (b[i] << m) & 0xFF : 0;
    if (m && n > 8 - m && i + 1 < b.length) v |= b[i + 1] >> (8 - m);
    out.push(n >= 8 ? v : v >> (8 - n));
  }
  return out;
}
const raw = (b, bp, n) => bp & 7 ? Uint8Array.from(rawBits(b, bp, 8 * n)) : b.subarray(bp >> 3, (bp >> 3) + n);
function bits(b, bp, n) {
  const a = bp & 7 || n & 7 ? rawBits(b, bp, n) : b.subarray(bp >> 3, (bp + n) >> 3);
  if (n > 48) return a.reduceRight((v, x) => v << 8n | BigInt(x), 0n);
  return a.reduceRight((v, x) => v * 256 + x, 0);
}

// danet Read(std::string): varint length then bytes; null unless it fills exactly n bits.
function string(b, bp, n) {
  let len = 0, pos = bp;
  for (let shift = 0; pos + 8 <= bp + n; shift += 7) {
    const c = bits(b, pos, 8);
    pos += 8;
    len += (c & 0x7F) * 2 ** shift;
    if (!(c & 0x80)) return pos + 8 * len === bp + n ? utf8.decode(raw(b, pos, len)) : null;
  }
  return null;
}

// Value of type dt at bit position bp, n bits long; dt "" guesses from n.
function read(dt, b, bp, n) {
  if (!dt) dt = {1: "bool", 8: "u8", 16: "uid", 32: "u32", 64: "u64"}[n] || (string(b, bp, n) !== null ? "str" : n <= 64 ? "bits" : "bytes");
  n = dt === "bool" && n === 1 ? 1 : Math.min(n, SIZES[dt] || n);
  if (dt === "bool") return !!bits(b, bp, n);
  if (["u8", "u16", "u32", "u64", "bits"].includes(dt)) return bits(b, bp, n);
  if (/^i\d/.test(dt)) { const v = BigInt(bits(b, bp, n)); return v >> BigInt(n - 1) ? v - (1n << BigInt(n)) : v; }
  if (dt === "uid") return "0x" + hex4(bits(b, bp, 16));
  if (dt === "f32" || dt === "f64" || dt === "vec3f") {
    const d = new DataView(raw(b, bp, n / 8).slice().buffer), f = dt === "f64" ? [d.getFloat64(0, true)] :
      Array.from({length: n / 32}, (_, i) => d.getFloat32(4 * i, true)), r = f.map(x => +x.toPrecision(7));
    return r.length === 1 ? r[0] : r;
  }
  if (dt === "varint") return varint(raw(b, bp, Math.min(5, n >> 3)), 0, 5)[0];
  if (dt === "str") return string(b, bp, n) ?? utf8.decode(raw(b, bp, n >> 3)).split("\0")[0];
  return Array.from(raw(b, bp, Math.min(n >> 3, 48)), x => x.toString(16).padStart(2, "0")).join(" ");
}
const num = v => typeof v === "bigint" ? (v >= -(2n ** 53n) && v <= 2n ** 53n ? Number(v) : v.toString()) : v;

// IdFieldSerializer32: u16 byte offset of the size table, varint field mask, the fields bit-packed, then one
// 3-bit size code per field (0 = varint size in bits). Returns [[field, bit pos, bits]] or null.
function table(b, start, end) {
  if (end - start < 4) return null;
  const off = b[start] | b[start + 1] << 8, [mask, body] = varint(b, start + 2, end);
  if (off < 3 || start + off >= end || !mask || body > start + off) return null;
  const ids = [...Array(32).keys()].filter(i => Math.floor(mask / 2 ** i) & 1), sizes = [];
  let bp = (start + off) * 8;
  for (const _ of ids) {
    if (bp + 3 > end * 8) return null;
    let size = [0, 1, 8, 16, 32, 64, 96, 128][bits(b, bp, 3)];
    bp += 3;
    if (!size) {
      for (let shift = 0; bp + 8 <= end * 8; shift += 7) {
        const c = bits(b, bp, 8);
        bp += 8;
        size += (c & 0x7F) * 2 ** shift;
        if (!(c & 0x80)) break;
      }
    }
    if (!size) return null;
    sizes.push(size);
  }
  let pos = body * 8;
  const fields = ids.map((f, i) => { pos += sizes[i]; return [f, pos - sizes[i], sizes[i]]; });
  return Math.ceil(bp / 8) === end && pos <= (start + off) * 8 ? fields : null;
}

const pkey = p => p.type === 4 && p.mid !== null ? hex4(p.mid) : "T" + p.type;
const fields = p => p.tab === undefined ? (p.tab = p.mpay ? table(p.b, p.mpay, p.end) : null) : p.tab;

// Framing: size prefix, u16 type, u32 time unless type & 0x10 (then the last time is inherited), payload.
function packets(b) {
  const out = [];
  let pos = 0, t = 0;
  while (pos < b.length) {
    const c = b[pos];
    let size, plen;
    if (c & 0x80) [size, plen] = [c & 0x7F, 1];
    else if (c & 0x70) { // 1-3 big-endian continuation bytes flagged by 0x40/0x20/0x10, flag XORed out
      plen = c & 0x40 ? 2 : c & 0x20 ? 3 : 4;
      size = 0;
      for (let i = 0; i < plen; i++) size = size * 256 + (b[pos + i] ?? 0);
      size -= {2: 0x4000, 3: 0x200000, 4: 0x10000000}[plen];
    } else [size, plen] = [(b[pos + 1] | b[pos + 2] << 8 | b[pos + 3] << 16) + b[pos + 4] * 2 ** 24, 5];
    if (!size || pos + plen + size > b.length) break;
    const p = {b, start: pos, plen, end: pos + plen + size, oid: null, ext: null, mid: null, mpay: null, hdrEnd: null};
    p.raw = b[pos + plen] | b[pos + plen + 1] << 8;
    p.type = p.raw & ~0x10;
    p.pay = pos + plen + 2;
    if (!(p.raw & 0x10)) { t = (b[p.pay] | b[p.pay + 1] << 8 | b[p.pay + 2] << 16) + b[p.pay + 3] * 2 ** 24; p.pay += 4; }
    p.ts = t;
    if (p.type === 4 && p.end - p.pay >= 4) { // MPI: u16 object id, [varint ext uid], u16 message id, payload
      p.oid = b[p.pay] | b[p.pay + 1] << 8;
      let q = p.pay + 2;
      if ((p.oid & 0x7FF) === 0x7FF && p.oid !== 0xFFFF) [p.ext, q] = varint(b, q, p.end);
      p.hdrEnd = q;
      if (p.ext !== null || q === p.pay + 2) [p.mid, p.mpay] = [b[q] | b[q + 1] << 8, q + 2];
    }
    out.push(p);
    pos = p.end;
  }
  return out;
}

const size = t => t[0] === "c" ? +t.slice(1) : SIZES[t] / 8;
function fmt(name, v) {
  if (["header", "magic", "session_id"].includes(name)) return "0x" + v.toString(16).toUpperCase();
  if (name === "game_version") return [48n, 32n, 16n, 0n].map(s => v >> s & 0xFFFFn).join(".");
  return num(v);
}

async function inflate(blob) {
  const s = new Blob([blob]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

async function parsePart(data, name) {
  if (data.length < HEADER_SIZE) throw new Error(`${name}: shorter than the header`);
  const header = HEADER.map(([o, t, n]) => [o, t, n, t[0] === "c" ?
    utf8.decode(data.subarray(o, o + size(t))).split("\0")[0] : read(t, data, o * 8, size(t) * 8)]);
  const h = Object.fromEntries(header.map(x => [x[2], x[3]]));
  const part = {data, name, header, h, blk: HEADER_SIZE + h.settings_blk_size, error: null};
  part.end = h.footer_blk_offset > part.blk && h.footer_blk_offset <= data.length ? h.footer_blk_offset : data.length;
  const blob = data.subarray(part.blk, part.end);
  part.comp = blob[0] === 0x28 && blob[1] === 0xB5 && blob[2] === 0x2F && blob[3] === 0xFD ? "zstd" : "zlib";
  try { part.stream = part.comp === "zstd" ? fzstd.decompress(blob) : await inflate(blob); }
  catch (e) { part.stream = new Uint8Array(0); part.error = `${name}: decompress failed: ${e.message || e}`; }
  part.packets = packets(part.stream);
  part.starts = part.packets.map(p => p.start);
  return part;
}

function regions(pt) {
  const r = pt.header.map(([o, t, n, v]) => ({start: o, end: o + size(t), kind: "hdr", name: "header." + n, type: t, value: fmt(n, v)}));
  r.push({start: HEADER_SIZE, end: pt.blk, kind: "blk", name: "settings BLK", type: "blk", value: `${pt.blk - HEADER_SIZE} B`},
    {start: pt.blk, end: pt.end, kind: "zst", name: `packet stream (${pt.comp})`, value: `${pt.end - pt.blk} -> ${pt.stream.length} B`});
  if (pt.end < pt.data.length) r.push({start: pt.end, end: pt.data.length, kind: "blk", name: "results BLK", type: "blk", value: `${pt.data.length - pt.end} B`});
  return r;
}

function* packetsIn(pt, s, e) {
  let lo = 0, hi = pt.starts.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (pt.starts[m] <= s) lo = m + 1; else hi = m; }
  for (let i = Math.max(0, lo - 1); i < pt.packets.length && pt.packets[i].start < e; i++)
    if (pt.packets[i].end > s) yield pt.packets[i];
}

// One .wrpl file, or all parts of a server replay: each part decoded alone, packets joined by part number.
async function openReplay(files) {
  const parts = await Promise.all(files.map(([name, data]) => parsePart(data, name)));
  parts.sort((a, b) => a.h.replay_part_number - b.h.replay_part_number);
  const all = [];
  parts.forEach((pt, i) => pt.packets.forEach(p => { p.part = i; p.idx = all.length; all.push(p); }));
  return {parts, packets: all};
}

function summary(r) {
  const h = r.parts[0].h;
  return {version: "0x" + h.magic.toString(16).toUpperCase().padStart(8, "0"), comp: r.parts[0].comp,
    server: h.player_no === -2147483648n || h.player_no === -2147483648, session: h.session_id.toString(16).padStart(16, "0"),
    parts: r.parts.map(p => p.name), fileSize: r.parts.reduce((a, p) => a + p.data.length, 0),
    streamSize: r.parts.reduce((a, p) => a + p.stream.length, 0), packets: r.packets.length, level: h.level_path,
    error: r.parts.map(p => p.error).filter(Boolean).join("; ")};
}

// Annotations: {scope:"packet", type, mpi_id?, field | offset+length (+bit_offset, bit_length), name, dtype, note};
// the offset counts from the MPI payload with mpi_id, else from the packet payload. scope "file": absolute offset.
const ANN_KEYS = "scope type mpi_id field offset length bit_offset bit_length name dtype note".split(" ");
class Annotations {
  constructor(base, user) { this.base = base; this.user = user; this.index(); }
  index() {
    this.items = [...this.base, ...this.user.map(a => ({...a, user: true}))];
    this.byKey = {};
    this.items.forEach((a, i) => {
      a.id = i;
      if (a.scope === "packet") (this.byKey[a.type + "|" + (a.mpi_id ? a.mpi_id.slice(2).toUpperCase() : "T" + a.type)] ??= []).push(a);
    });
  }
  add(e) {
    const a = {};
    for (const k of ANN_KEYS) if (e[k] !== undefined && e[k] !== null && e[k] !== "") a[k] = e[k];
    for (const k of ["type", "field", "offset", "length", "bit_offset", "bit_length"]) if (k in a) a[k] = +a[k];
    if (a.mpi_id) a.mpi_id = "0x" + hex4(parseInt(a.mpi_id, 16));
    if ("field" in a) for (const k of ["offset", "length", "bit_offset", "bit_length"]) delete a[k];
    if (!["packet", "file"].includes(a.scope) || !a.name || !("field" in a) && !a.length) throw new Error("need scope, name and field or offset+length");
    const same = x => ANN_KEYS.slice(0, 8).every(k => x[k] === a[k]);
    this.user = [...this.user.filter(x => !same(x)), a];
    this.index();
  }
  remove(id) { const a = this.items[id]; this.user = this.user.filter(x => !ANN_KEYS.every(k => x[k] === a[k])); this.index(); }
  spans(p) { // [start, end, entry, bit pos, bits]
    const out = [];
    for (const [key, base] of [["T" + p.type, p.pay], [pkey(p), p.mpay]]) {
      if (base === null) continue;
      for (const a of this.byKey[p.type + "|" + key] || []) {
        if ("field" in a) {
          const f = (fields(p) || []).find(f => f[0] === a.field);
          if (f) out.push([f[1] >> 3, (f[1] + f[2] + 7) >> 3, a, f[1], f[2]]);
        } else if (base + a.offset < p.end) {
          const s = base + a.offset;
          out.push([s, Math.min(s + a.length, p.end), a, 8 * s + (a.bit_offset || 0), a.bit_length || 8 * a.length]);
        }
      }
    }
    return out;
  }
  values(p) { return Object.fromEntries(this.spans(p).map(([, , a, bp, n]) => [a.name, num(read(a.dtype || "", p.b, bp, n))])); }
}

// [label, kind, sync, detail] of a packet.
function event(p, ann) {
  const k = pkey(p), name = p.type === 4 ? MPI_NAMES[p.mid] : null;
  let [label, kind, sync] = EVENTS[k] || (name ? [name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^(.)(.*)$/,
    (_, a, b) => a.toUpperCase() + b.toLowerCase()), "other", false] : ["unknown " + k, "unknown", false]), detail = null;
  if (sync) return [label, kind, sync, null];
  if (p.type === 3) { // chat: sender, text (danet strings)
    let [n1, q] = varint(p.b, p.pay, p.end);
    const who = utf8.decode(p.b.subarray(q, q + n1)), [n2, r] = varint(p.b, q + n1, p.end);
    detail = who + ": " + utf8.decode(p.b.subarray(r, r + n2));
  } else if (k === "D039" || k === "B00E") {
    const v = ann.values(p), cid = v.class_id;
    if (v.compressed_flag < 0) detail = "zstd-compressed body";
    else if (typeof cid === "number") {
      const d = p.b.subarray(p.mpay + 4, p.end);
      let nm = null; // first u8 length + printable text
      for (let i = 0; i < d.length && nm === null; i++)
        if (d[i] >= 4 && i + 1 + d[i] <= d.length && d.subarray(i + 1, i + 1 + d[i]).every(c => c >= 32 && c < 127))
          nm = utf8.decode(d.subarray(i + 1, i + 1 + d[i]));
      detail = (CLASSES[cid] || "class " + cid) + (nm ? ` '${nm}'` : "");
      if (SPAWN[cid]) [label, kind, detail] = ["Unit spawn", "spawn", `${SPAWN[cid]} (${CLASSES[cid]})`];
    }
  } else if (DETAILS[k]) {
    const v = ann.values(p);
    if (Object.keys(v).length) {
      if (v.killer_uid === "0xFFFF") detail = `${v.victim_uid} died, no killer`;
      else detail = DETAILS[k].replace(/\{(\w+)(?::(\d+))?\}/g, (_, n, w) => v[n] === undefined ? "?" :
        v[n] === "0xFFFF" ? "none" : w ? String(v[n]).padStart(+w, "0") : v[n]).replace(" ()", "").replace(/, weapon $/, "");
    }
  }
  return [label, kind, sync, detail];
}

const objName = p => "0x" + hex4(p.oid) + " " + (p.oid >> 11 === 11 && GLOBALS[p.oid & 0x7FF] ? "Global." + GLOBALS[p.oid & 0x7FF] :
  (OBJECTS[p.oid >> 11] || "type" + (p.oid >> 11)) + (p.ext !== null ? "" : `[${p.oid & 0x7FF}]`));

// Known sub-ranges of packet p, outermost first.
function partsOf(p, ann) {
  const tname = PACKET_TYPES[p.type] || "type " + p.type, [label, , , detail] = event(p, ann), body = p.start + p.plen;
  const f = (start, end, kind, name, type, value, x = {}) => ({start, end, kind, level: "field", name, type, value, ...x});
  const out = [
    f(p.start, p.end, "pkt", `packet #${p.idx} · ${p.ts} ms · ${label}${detail ? ": " + detail : ""} · ${p.end - p.start} B`,
      "", `type ${p.type} ${tname}`, {level: "packet"}),
    f(p.start, body, "prefix", "size prefix", `varsize[${p.plen}]`, p.end - body),
    f(body, body + 2, "ptype", "type", "u16", `0x${hex4(p.raw)} = ${tname}` + (p.raw & 0x10 ? " | 0x10 inherit time" : ""))];
  if (!(p.raw & 0x10)) out.push(f(body + 2, body + 6, "ts", "timestamp", "u32", p.ts + " ms"));
  if (p.oid !== null) {
    const m = p.mid !== null ? `0x${hex4(p.mid)} ${MPI_NAMES[p.mid] || "(unnamed)"}` : "(truncated)";
    out.push(f(p.pay, p.end, "mpi", `MPI ${m} · object ${objName(p)}` + (p.mpay ? ` · payload ${p.end - p.mpay} B` : ""), "", "", {level: "mpi"}),
      f(p.pay, p.pay + 2, "mpihdr", "object id", "u16", objName(p)));
    if (p.ext !== null) out.push(f(p.pay + 2, p.hdrEnd, "mpihdr", "object ext uid", "varint", "0x" + p.ext.toString(16).toUpperCase()));
    if (p.mid !== null) out.push(f(p.hdrEnd, p.mpay, "mpihdr", "message id", "u16", m));
  }
  const fl = fields(p);
  if (fl) {
    const named = new Set((ann.byKey[p.type + "|" + pkey(p)] || []).map(a => a.field));
    out.push(f(p.mpay, fl[0][1] >> 3, "idf", "field table header", "u16 + varint", "fields " + fl.map(x => x[0]).join(",")),
      f(p.mpay + (p.b[p.mpay] | p.b[p.mpay + 1] << 8), p.end, "idf", "field size table", "3-bit codes", fl.length + " sizes"));
    for (const [id, bp, n] of fl) if (!named.has(id))
      out.push(f(bp >> 3, (bp + n + 7) >> 3, "fld", "field " + id, n + " bits", num(read("", p.b, bp, n)), {bits: [bp & 7, n]}));
  }
  for (const [s, e, a, bp, n] of ann.spans(p))
    out.push(f(s, e, "ann", a.name, (a.dtype || "") + ("field" in a ? ` (field ${a.field})` : ""), num(read(a.dtype || "", p.b, bp, n)),
      {note: a.note || "", id: a.id, user: !!a.user, bits: [bp - 8 * s, n]}));
  return out;
}

function fileSpans(pt, ann) {
  return ann.items.filter(a => a.scope === "file").map(a => ({start: a.offset, end: a.offset + a.length, kind: "ann", level: "field",
    name: a.name, type: a.dtype || "", value: num(read(a.dtype || "", pt.data, 8 * a.offset, 8 * a.length)), note: a.note || "", id: a.id, user: !!a.user}));
}

function coverage(r, ann) {
  const total = r.parts.reduce((a, p) => a + p.stream.length, 0) || 1;
  let frame = 0, done = 0;
  for (const p of r.packets) {
    const known = p.mpay || p.pay;
    frame += known - p.start;
    let cur = known;
    for (const [s, e] of ann.spans(p).map(([s, e]) => [Math.max(s, known), e]).sort((a, b) => a[0] - b[0]))
      if (e > cur) { done += e - Math.max(s, cur); cur = e; }
  }
  return {known: +(100 * (frame + done) / total).toFixed(2), frame, annotated: done, payload: +(100 * done / Math.max(1, total - frame)).toFixed(2)};
}

// Generic annotation key for a selection starting at byte s.
function context(r, view, part, s) {
  if (view === "raw") return {scope: "file", offset: s};
  const p = packetsIn(r.parts[part], s, s + 1).next().value;
  if (!p || s < p.pay) return null;
  if (p.mpay && s >= p.mpay) {
    const fl = fields(p) || [], f = fl.find(([, bp]) => bp >> 3 === s) || fl.find(([, bp, n]) => bp >> 3 <= s && s < (bp + n + 7) >> 3);
    return {scope: "packet", type: 4, mpi_id: "0x" + hex4(p.mid), offset: s - p.mpay, field: f ? f[0] : null};
  }
  return {scope: "packet", type: p.type, mpi_id: null, offset: s - p.pay, field: null};
}

// One key's value in every packet of its kind: [[time ms, value, packet idx]].
function plot(r, key, dt) {
  const mid = key.mpi_id ? parseInt(key.mpi_id, 16) : null, out = [];
  for (const p of r.packets) {
    if (p.type !== +key.type || mid !== null && p.mid !== mid) continue;
    if (key.field !== null && key.field !== undefined && key.field !== "") {
      const f = (fields(p) || []).find(x => x[0] === +key.field);
      if (f) out.push([p.ts, num(read(dt, p.b, f[1], f[2])), p.idx]);
      continue;
    }
    const bp = 8 * ((mid !== null ? p.mpay : p.pay) + +key.offset) + (+key.bit_offset || 0), n = +key.bit_length || 8 * (+key.length || 1);
    if (bp + n <= 8 * p.end) out.push([p.ts, num(read(dt, p.b, bp, n)), p.idx]);
  }
  return out;
}
