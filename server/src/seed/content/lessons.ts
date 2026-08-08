import type { SeedLesson } from '../../types'

// Authored in Phase 2 (content authoring). One or more lessons per topic,
// each with markdown body and optional diagram JSON for the interactive canvas.
export const lessons: SeedLesson[] = [
  {
    topicSlug: 'scale-from-zero-to-millions',
    slug: 'the-single-server-to-scale',
    title: 'The Single Server to Scale',
    orderIndex: 0,
    bodyMd: `## Everything Starts With One Server

Facebook ran on a single machine in 2004. Google started on commodity hardware in a garage. You don't design for millions of users on day one — you design so you can *get* to millions without rewriting everything.

### The single-server architecture

A single server hosts the web server, the application code, **and** the database:

- **Web server** (Nginx, Apache) — serves static assets and proxies requests.
- **Application layer** — business logic, rendering, and the API.
- **Database** — stores users, posts, and state.

The browser hits \`example.com\`, DNS resolves to the server's IP, and the server returns the page.

### Traffic grows — what breaks?

- The web server and app share CPU and RAM with the database, so one slow query stalls the whole site.
- The database runs out of disk and connections.
- There is a single point of failure: if the machine dies, the site is down.

### Scale up (vertical scaling)

Add more CPU, RAM, and faster disks to the *same* machine.

**Pros:** no code changes, no distributed-systems complexity.
**Cons:** you hit a hardware ceiling, cost rises super-linearly, and you still have a single point of failure.

### Scale out (horizontal scaling)

Add *more* machines and split work between them.

**Pros:** near-linear cost scaling, redundancy, no hard ceiling.
**Cons:** you now have a distributed system — load balancing, session management, replication, and consistency all become your problem.

### The standard progression

1. Single server.
2. Split the database onto its own machine.
3. Add a load balancer and a pool of **stateless** app servers.
4. Add a cache in front of the database.
5. Add a CDN in front of static content.
6. Replicate the database (read replicas).
7. Split data across databases (sharding).
8. Scale to multiple regions and data centers.

> **Key idea:** every step adds infrastructure to remove a bottleneck — but each piece adds its own failure mode. Great system design is knowing which step to take *when*.`,
    diagram: {
      nodes: [
        { id: 'client', label: 'Users', kind: 'client', x: 80, y: 260 },
        { id: 'cdn', label: 'CDN', kind: 'cdn', x: 240, y: 260 },
        { id: 'lb', label: 'Load Balancer', kind: 'lb', x: 400, y: 260 },
        { id: 'app1', label: 'App Server 1', kind: 'server', x: 560, y: 160 },
        { id: 'app2', label: 'App Server 2', kind: 'server', x: 560, y: 360 },
        { id: 'cache', label: 'Cache (Redis)', kind: 'cache', x: 720, y: 260 },
        { id: 'db', label: 'Database', kind: 'db', x: 880, y: 260 },
      ],
      edges: [
        { from: 'client', to: 'cdn', label: 'HTTPS' },
        { from: 'cdn', to: 'lb', label: 'origin pull' },
        { from: 'lb', to: 'app1' },
        { from: 'lb', to: 'app2' },
        { from: 'app1', to: 'cache', label: 'read' },
        { from: 'app2', to: 'cache', label: 'read' },
        { from: 'app1', to: 'db', label: 'SQL' },
        { from: 'app2', to: 'db', label: 'SQL' },
      ],
    },
  },
  {
    topicSlug: 'scale-from-zero-to-millions',
    slug: 'the-scale-cube-and-statelessness',
    title: 'The Scale Cube & Statelessness',
    orderIndex: 1,
    bodyMd: `## The Scale Cube

The *Scale Cube* (from *The Art of Scalability*) splits scaling into three axes.

### X-axis — horizontal cloning

Run N identical copies of the app behind a load balancer. Easiest, but it doesn't fix hot data or long-tail queries.

### Y-axis — split by function / domain

Decompose the monolith into services: users, billing, search. Each service owns its data — this is microservices territory.

### Z-axis — split by data

Shard by some attribute (\`user_id\`, region). Every shard runs the same code but owns a slice of the data.

### Statelessness is the enabler

For X-axis cloning to work, app servers must be **stateless**: any request must be able to go to any server.

- Sessions move out of server memory into a shared store (Redis or a database).
- Auth is verified via signed tokens (JWT) so any server can validate them without shared session state.
- Uploads go to object storage, not the local disk.

If a server holds user state in memory, the load balancer needs sticky sessions — and a restart of that server logs the user out.

### Trade-offs summary

| Axis | Solves | Doesn't solve |
|------|--------|---------------|
| X | More concurrent traffic | Hot keys, data size |
| Y | Team velocity, fault isolation | Data volume per service |
| Z | Data size, write throughput | Code sharing, cross-shard joins |

> **Interview tip:** when asked "how would you scale X", most candidates jump straight to adding servers. A senior answer starts with *statelessness*, then picks the right cube axis for the actual bottleneck.`,
    diagram: {
      nodes: [
        { id: 'client', label: 'Client', kind: 'client', x: 80, y: 260 },
        { id: 'gw', label: 'API Gateway', kind: 'lb', x: 260, y: 260 },
        { id: 'users', label: 'Users Service', kind: 'server', x: 460, y: 120 },
        { id: 'posts', label: 'Posts Service', kind: 'server', x: 460, y: 260 },
        { id: 'search', label: 'Search Service', kind: 'server', x: 460, y: 400 },
        { id: 'udb', label: 'Users DB', kind: 'db', x: 660, y: 120 },
        { id: 'pdb', label: 'Posts DB', kind: 'db', x: 660, y: 260 },
        { id: 'sdb', label: 'Search Index', kind: 'db', x: 660, y: 400 },
      ],
      edges: [
        { from: 'client', to: 'gw' },
        { from: 'gw', to: 'users' },
        { from: 'gw', to: 'posts' },
        { from: 'gw', to: 'search' },
        { from: 'users', to: 'udb' },
        { from: 'posts', to: 'pdb' },
        { from: 'search', to: 'sdb' },
      ],
    },
  },
  {
    topicSlug: 'back-of-the-envelope-estimation',
    slug: 'estimation-fundamentals',
    title: 'Estimation Fundamentals',
    orderIndex: 0,
    bodyMd: `## Numbers Before Design

Back-of-the-envelope (BOTE) estimation is the math you do **before** designing so you know what you're designing *for*. Interviewers rarely care about exact figures — they care that your assumptions are stated and your arithmetic is sane.

### The three numbers that matter

1. **QPS** (queries per second) — average and peak.
2. **Storage** — how much data you'll accumulate over 5–10 years.
3. **Bandwidth** — bytes in/out per second, which drives network sizing.

### Start with daily active users, not "users"

Always anchor to DAU/MAU, then convert:

- 1M DAU
- Each user makes 20 reads + 2 writes per day
- Reads: 1M × 20 = 20M reads/day
- Seconds/day = 86,400 ≈ 8.6 × 10⁴ (use 100k for rough math)
- Average read QPS ≈ 20M / 100k = **200 QPS**
- Peak QPS ≈ 5–10× average = **1,000–2,000 QPS**

### Storage math

Each read/write carries payload bytes. Storage = *write volume* × *payload* × *retention*:

- 2M writes/day × 500 bytes = 1 GB/day ≈ 365 GB/year → ~2 TB over 5 years.

### Handy powers of ten (memorize these)

| Number | Approx |
|--------|--------|
| 1 day | ~10⁵ seconds |
| 1 month | ~2.5 × 10⁶ seconds |
| 1 year | ~3 × 10⁷ seconds |
| 1 MB | 10⁶ bytes |
| 1 GB | 10⁹ bytes |
| 1 TB | 10¹² bytes |

> **Rule of thumb:** never present a single number — present a *range* with your assumption attached: "assuming 50% DAU engagement and 500-byte posts, storage is roughly 2–4 TB/year."
`,
    diagram: {
      nodes: [
        { id: 'dau', label: 'DAU', kind: 'other', x: 120, y: 200 },
        { id: 'act', label: 'Actions/user/day', kind: 'other', x: 320, y: 200 },
        { id: 'day', label: 'Seconds/day ≈ 10⁵', kind: 'other', x: 520, y: 200 },
        { id: 'qps', label: 'QPS', kind: 'other', x: 720, y: 200 },
        { id: 'peak', label: 'Peak = 5–10× avg', kind: 'other', x: 720, y: 340 },
      ],
      edges: [
        { from: 'dau', to: 'act' },
        { from: 'act', to: 'day' },
        { from: 'day', to: 'qps' },
        { from: 'qps', to: 'peak' },
      ],
    },
  },
  {
    topicSlug: 'back-of-the-envelope-estimation',
    slug: 'estimation-worked-example',
    title: 'Estimation Worked Example: A Feed',
    orderIndex: 1,
    bodyMd: `## Worked Example: Twitter-Style Feed

Design a read-heavy feed. Let's estimate before drawing a single box.

### Assumptions (state them out loud)

- 200M DAU
- Average user: 200 reads/day, 2 writes/day
- A feed item ≈ 1 KB (with text + metadata)
- Retention: store posts forever, feed index for 1 year

### QPS

- Reads: 200M × 200 = 40B reads/day
- 40B / 10⁵ s ≈ **400,000 read QPS**
- Peak: ×5 → **2M read QPS**
- Writes: 200M × 2 = 400M writes/day ≈ **4,000 write QPS**

### Storage

- 400M new items/day × 1 KB = 400 GB/day
- 400 GB × 365 ≈ **146 TB/year**

### Bandwidth

- Reads dominate: 400k QPS × 1 KB ≈ **400 MB/s** average egress
- Peaks: ~2 GB/s — you are now talking about CDN and edge caching, not a single rack.

### What these numbers tell the designer

- **400k read QPS** → no database can serve this alone; you need cache-aside + CDN + possibly a fanout index.
- **4k write QPS** → a single Postgres primary with read replicas *can* absorb this, but you'd still separate writes from reads.
- **146 TB/year** → range-partition posts by time, hash-partition users; warm-tier vs cold-tier storage.

### The discipline

1. Round aggressively (86,400 → 10⁵).
2. Sanity-check: is the answer within an order of magnitude of a known system? A mature feed doing ~400k rps is plausible; 4 billion is not.
3. Stop when the number is *good enough to drive architecture* — BOTE is for decisions, not accounting.`,
    diagram: {
      nodes: [
        { id: 'r1', label: '200M DAU × 200 reads', kind: 'other', x: 100, y: 140 },
        { id: 'r2', label: '40B reads/day', kind: 'other', x: 320, y: 140 },
        { id: 'r3', label: '≈ 400k QPS', kind: 'other', x: 560, y: 140 },
        { id: 'w1', label: '200M × 2 writes', kind: 'other', x: 100, y: 320 },
        { id: 'w2', label: '400M writes/day', kind: 'other', x: 320, y: 320 },
        { id: 'w3', label: '≈ 4k QPS', kind: 'other', x: 560, y: 320 },
        { id: 's1', label: '1 KB × 400M/day', kind: 'other', x: 100, y: 500 },
        { id: 's2', label: '400 GB/day', kind: 'other', x: 320, y: 500 },
        { id: 's3', label: '≈ 146 TB/year', kind: 'other', x: 560, y: 500 },
      ],
      edges: [
        { from: 'r1', to: 'r2' },
        { from: 'r2', to: 'r3' },
        { from: 'w1', to: 'w2' },
        { from: 'w2', to: 'w3' },
        { from: 's1', to: 's2' },
        { from: 's2', to: 's3' },
      ],
    },
  },
  {
    topicSlug: 'latency-throughput-availability',
    slug: 'latency-and-throughput',
    title: 'Latency & Throughput',
    orderIndex: 0,
    bodyMd: `## Two Metrics People Love to Mix Up

**Latency** is *time per request* — how long one user waits. **Throughput** is *requests per second* — how many users you serve. They're related but not the same, and optimizing one often hurts the other.

### Latency distributions, not averages

Averages hide the pain. Use percentiles:

- **P50 (median)** — typical experience.
- **P99** — the slowest 1% of requests. This is what "the user who notices" feels.
- **P999** — one in a thousand. This is what your alerting monitors.

A "50 ms average" can hide a P99 of 2 s. Always reason about the *tail*.

### The long tail in practice

Service calls compose: if a page calls 10 services, each at P99 = 100 ms, the naive worst case is 1 s. Real systems:

- Set client timeouts so one slow service doesn't stall the page.
- Use **parallel** calls instead of serial where dependencies allow.
- Use circuit breakers to fail fast once a dependency is known-slow.

### Throughput

Throughput is bounded by the *bottleneck resource* (CPU, disk IOPS, network, DB locks). Adding instances raises throughput until the bottleneck moves elsewhere — that's why profiling matters.

### Little's Law (the connection)

> L = λ × W — in steady state, the number of requests in the system equals arrival rate × average time in system.

Raise concurrency (requests in flight) and you raise throughput — but *only* until the resource saturates; then queueing delay blows up latency.

### Key takeaways

- Report latency as a distribution (P50/P99), not an average.
- Tail latency, not median, is what users feel.
- Throughput = concurrency / latency, capped by the bottleneck resource.`,
    diagram: {
      nodes: [
        { id: 'req', label: 'Requests', kind: 'client', x: 100, y: 260 },
        { id: 'pipe', label: 'System', kind: 'server', x: 320, y: 260 },
        { id: 'lat', label: 'Latency (time/req)', kind: 'other', x: 560, y: 160 },
        { id: 'tput', label: 'Throughput (req/s)', kind: 'other', x: 560, y: 360 },
      ],
      edges: [
        { from: 'req', to: 'pipe' },
        { from: 'pipe', to: 'lat' },
        { from: 'pipe', to: 'tput' },
      ],
    },
  },
  {
    topicSlug: 'latency-throughput-availability',
    slug: 'availability-and-the-nines',
    title: 'Availability & the Nines',
    orderIndex: 1,
    bodyMd: `## The Nines and What They Actually Cost

Availability = uptime / (uptime + downtime). It's a *probability*, not a promise — and each "nine" is an order of magnitude harder.

### The nines table

| Availability | Downtime / year | Downtime / month |
|--------------|-----------------|------------------|
| 99%          | 3.65 days       | 7.3 hours        |
| 99.9%        | 8.77 hours      | 43.8 min         |
| 99.99%       | 52.6 min        | 4.4 min          |
| 99.999%      | 5.26 min        | 26 s             |
| 99.9999%     | 31.6 s          | 2.6 s            |

### What "5 nines" really demands

Going from 99.9% to 99.99% means cutting unplanned downtime from ~9 hours/year to under an hour. That demands:

- Redundant components with **automatic** failover (not "a human pages the on-call at 3am").
- Graceful degradation — if a subsystem fails, serve *something*.
- Regular, tested failover drills. An untested failover path is not a failover path.
- Monitoring that detects failure faster than users do.

### Availability is a chain

If a request needs three components and each is 99.9% available, the *composed* availability is:

> 0.999 × 0.999 × 0.999 ≈ **0.997** (99.7%)

Dependencies multiply availability. This is the core argument for *decoupling*: a cache that serves stale-but-recent data keeps the site up when the database blips.

### Nines vs. SLOs

- An **SLO** is the target you contract to (e.g., 99.9% of requests under 200 ms).
- The **SLI** is the measurement (e.g., % of requests under 200 ms).
- The **error budget** is 100% − SLO. If you exhaust it, you stop shipping risky changes.

> **Tricky truth:** "99.99% availability" is meaningless without defining *which requests* count and over *what window*. A health check that only pings the homepage is not measuring user availability.`,
    diagram: {
      nodes: [
        { id: 'lb', label: 'LB 99.9%', kind: 'lb', x: 120, y: 200 },
        { id: 'app', label: 'App 99.9%', kind: 'server', x: 320, y: 200 },
        { id: 'db', label: 'DB 99.9%', kind: 'db', x: 520, y: 200 },
        { id: 'prod', label: '0.999³ ≈ 99.7%', kind: 'other', x: 720, y: 200 },
      ],
      edges: [
        { from: 'lb', to: 'app' },
        { from: 'app', to: 'db' },
        { from: 'db', to: 'prod' },
      ],
    },
  },
  {
    topicSlug: 'cap-and-consistency-models',
    slug: 'the-cap-theorem',
    title: 'The CAP Theorem',
    demo: 'cap-triangle',
    orderIndex: 0,
    bodyMd: `## CAP: You Get to Pick Two (During a Partition)

CAP states that under **network partitions** — nodes that cannot reach each other — a distributed system must choose between:

- **C — Consistency:** every read returns the latest write (linearizability).
- **A — Availability:** every request gets a response (even if it may be stale).

You literally cannot have both during a partition. The P is not a choice: networks *will* partition, so every system is really CP or AP **during** a partition, and CA only when the network is healthy.

### The common misreading

Many people say "pick 2 of 3." Wrong framing. You always need partitions to behave well; the real choice is: *when the network is broken, do you fail (CP) or keep serving stale data (AP)?*

- **CP** — e.g., HBase, MongoDB (with default settings), Zookeeper. During a partition, non-majority nodes refuse writes rather than diverge.
- **AP** — e.g., Cassandra, DynamoDB, DNS. During a partition, nodes keep accepting writes and reconcile later (last-write-wins, vector clocks).

### PACELC — the "and" people forget

PACELC extends CAP: **P**artition → **A**vailability vs **C**onsistency; **E**lse (no partition) → **L**atency vs **C**onsistency.

This is the trade-off you make *all the time*: even in a healthy network, replicating synchronously to guarantee consistency adds latency. Most systems pick lower latency (eventual consistency) and pay for it with read-your-writes hacks or read-repair.

### Applying CAP to design

- **Primary database (billing, inventory):** prefer CP. You cannot "eventually" deduct the same $20 twice.
- **Social feed, likes, presence:** prefer AP. A stale "like count" is fine; a 500 error is not.

> **Interview trap:** "So CAP says a system can't be consistent and available?" — Answer: *only during a partition*, and modern systems use per-operation consistency levels precisely because the answer isn't global.`,
    diagram: {
      nodes: [
        { id: 'nodeA', label: 'Node A', kind: 'server', x: 120, y: 180 },
        { id: 'part', label: 'Partition!', kind: 'other', x: 320, y: 180 },
        { id: 'nodeB', label: 'Node B', kind: 'server', x: 520, y: 180 },
        { id: 'cp', label: 'CP: refuse writes (fail)', kind: 'db', x: 720, y: 100 },
        { id: 'ap', label: 'AP: accept + reconcile', kind: 'cache', x: 720, y: 280 },
      ],
      edges: [
        { from: 'nodeA', to: 'part' },
        { from: 'part', to: 'nodeB' },
        { from: 'nodeB', to: 'cp' },
        { from: 'nodeB', to: 'ap' },
      ],
    },
  },
  {
    topicSlug: 'cap-and-consistency-models',
    slug: 'consistency-models',
    title: 'Consistency Models',
    orderIndex: 1,
    bodyMd: `## Strong, Causal, Eventual — and Where Each Fits

Consistency models describe what a reader is allowed to see after writes. They are a *spectrum of guarantees*, not a binary.

### Strong consistency (linearizability)

Every read sees the result of the latest completed write, as if there were a single global clock. This is what a single-node database gives you.

**Cost:** synchronous replication or quorum reads → higher latency, lower availability.

### Causal consistency

If write A *causes* write B (e.g., a comment follows its parent post), every reader who sees B also sees A. Writes that are unrelated may appear in any order. This matches how humans reason about events — and it's good enough for most feeds.

### Eventual consistency

Given no new writes, replicas converge to the same value — eventually. Reads may be stale, and concurrent writers may *conflict*.

- **Last-write-wins** (LWW): simple, but can silently drop a concurrent update.
- **Version / vector clocks**: track causality so conflicts can be detected and merged (Dynamo-style).

### ACID vs BASE

| | ACID (relational) | BASE (distributed/NoSQL) |
|---|---|---|
| Atomicity | Yes | Basically Available |
| Consistency | Strong | Soft state |
| Isolation | Serializable | Eventually consistent |

BASE is not "less correct" — it's a *different contract*: availability and partition tolerance first, with the app handling eventual convergence.

### Choosing per operation

One system can mix models:

- **Write path:** sync-replicate the critical write, async-replicate the rest.
- **Read path:** quorum read for money movements, stale-read from a cache for profiles.

> **The senior move:** don't answer "which consistency?" with one word. Say *"default eventual, strong for [specific critical operations], here's how I detect and merge conflicts."*`,
    diagram: {
      nodes: [
        { id: 'w', label: 'Writer', kind: 'client', x: 80, y: 200 },
        { id: 'r1', label: 'Replica 1', kind: 'server', x: 280, y: 120 },
        { id: 'r2', label: 'Replica 2', kind: 'server', x: 280, y: 280 },
        { id: 'strong', label: 'Strong: read hits majority', kind: 'db', x: 520, y: 120 },
        { id: 'eventual', label: 'Eventual: stale OK, reconcile', kind: 'cache', x: 520, y: 280 },
      ],
      edges: [
        { from: 'w', to: 'r1' },
        { from: 'w', to: 'r2' },
        { from: 'r1', to: 'strong' },
        { from: 'r2', to: 'eventual' },
      ],
    },
  },
  {
    topicSlug: 'load-balancing',
    slug: 'load-balancing-fundamentals',
    demo: 'lb-4-vs-7',
    title: 'Load Balancing Fundamentals',
    orderIndex: 0,
    bodyMd: `## L4 vs L7, and Every Algorithm

A load balancer sits in front of a pool of servers and distributes traffic. The two big choices: *what layer* it operates at, and *what algorithm* it uses.

### Layer 4 (transport): IP + port

- Inspects TCP/UDP headers only — no HTTP understanding.
- **Fast, low overhead**, routes whole connections to a backend.
- Can't make content-aware decisions (no cookies, no paths).

### Layer 7 (application): HTTP-aware

- Terminates TLS, reads URLs, headers, cookies.
- Can route by path (\`/api\` vs \`/static\`), by host, by cookie — which enables **path-based** and **header-based** routing.
- Slower per request (protocol parsing), but far more powerful.

### The classic algorithms

| Algorithm | Behavior | Use when |
|-----------|----------|----------|
| Round robin | Cycles servers in order | Uniform servers, uniform load |
| Weighted RR | Serves better machines more | Heterogeneous capacity |
| Least connections | Sends to the least-loaded | Variable request durations |
| Least response time | Combines connections + latency | Latency-sensitive workloads |
| IP hash / consistent hash | Pins a client to a server | Sticky state, cache locality |

### Health checks

A LB only routes to *healthy* backends:

- **Active** — periodic probe (\`GET /healthz\`, TCP connect, TLS handshake).
- **Passive** — track connection failures and 5xx rates; pull a server out after a threshold.

Always implement a cheap, dependency-free health endpoint — it should *not* check the database, or a DB blip makes every backend "unhealthy" and the whole site falls over.

> **Gotcha:** L7 TLS termination means the LB sees plaintext to the backends. Use mTLS or a private network between LB and servers, and keep the backend subnet non-public.`,
    diagram: {
      nodes: [
        { id: 'client', label: 'Clients', kind: 'client', x: 80, y: 260 },
        { id: 'lb', label: 'LB (L4/L7)', kind: 'lb', x: 300, y: 260 },
        { id: 's1', label: 'S1 (healthy)', kind: 'server', x: 540, y: 120 },
        { id: 's2', label: 'S2 (healthy)', kind: 'server', x: 540, y: 260 },
        { id: 's3', label: 'S3 (draining)', kind: 'server', x: 540, y: 400 },
      ],
      edges: [
        { from: 'client', to: 'lb' },
        { from: 'lb', to: 's1' },
        { from: 'lb', to: 's2' },
        { from: 'lb', to: 's3', label: 'stopped' },
      ],
    },
  },
  {
    topicSlug: 'load-balancing',
    slug: 'load-balancer-architecture',
    title: 'Load Balancer Architecture & Placement',
    orderIndex: 1,
    bodyMd: `## Where Load Balancers Live

A single LB is a single point of failure — so you run LBs in pairs (active/passive or active/active) with a floating IP / VIP, and health-check *each other*.

### Layering LBs

Real systems have several tiers of LB:

1. **Edge / DNS layer** — geo-DNS or global server load balancing (GSLB) routes users to the nearest region.
2. **L4 LB in front of L7 LBs** — cheap packet-level distribution (e.g., HAProxy, AWS NLB) fans out to a smaller pool of L7 LBs.
3. **L7 LB in front of app servers** — path/host routing, TLS termination, request rewriting, WAF.

### Sticky sessions (session affinity)

If your app holds state, the LB pins a user to one server via a cookie or hash. This is a *workaround*, not a design:

- Sticky sessions break the statelessness that lets you scale and fail over freely.
- Fix the root cause: push session state to Redis or a database, and make the app servers stateless. Then any server can serve any user.

### Graceful draining

When a server must come out of the pool (deploy, scale-in), you **drain** it:

1. Mark it unhealthy so new connections stop.
2. Let in-flight requests finish (drain window).
3. Only then terminate.

If you kill connections mid-request, users get 502s on every deploy — the classic "deploys cause errors" smell.

### Placement rules of thumb

- L4 where you need raw throughput and minimal latency.
- L7 where you need routing, TLS, or WAF features.
- Always: LB must be *redundant*, and backends must be *discoverable* (via the LB's health checks, not hardcoded IPs).

> **Key idea:** the LB turns a list of fragile machines into a single robust endpoint. Design backends as interchangeable, stateless pods and the LB does the rest.`,
    diagram: {
      nodes: [
        { id: 'dns', label: 'Geo-DNS', kind: 'other', x: 80, y: 120 },
        { id: 'l4a', label: 'L4 LB (active)', kind: 'lb', x: 280, y: 120 },
        { id: 'l4b', label: 'L4 LB (passive)', kind: 'lb', x: 280, y: 280 },
        { id: 'l7', label: 'L7 LB pool', kind: 'lb', x: 500, y: 200 },
        { id: 'app', label: 'Stateless app servers', kind: 'server', x: 720, y: 200 },
      ],
      edges: [
        { from: 'dns', to: 'l4a' },
        { from: 'dns', to: 'l4b' },
        { from: 'l4a', to: 'l7' },
        { from: 'l4b', to: 'l7' },
        { from: 'l7', to: 'app' },
      ],
    },
  },
  {
    topicSlug: 'caching',
    slug: 'caching-policies',
    title: 'Caching Policies: Read & Write',
    demo: 'cache-policies',
    orderIndex: 0,
    bodyMd: `## Cache-Aside Is the Default. Know the Others.

Caches trade memory for latency. The tricky part isn't the hardware — it's deciding *when* data gets into and out of the cache.

### Cache-aside (lazy loading)

1. Read: check cache → hit, return; miss, read DB → write cache → return.
2. Write: write DB → invalidate cache entry.

**Pros:** cache only holds what's actually read; a cache failure doesn't lose data (app falls back to DB).
**Cons:** first read after invalidation is a cache *miss* (slow), and a popular key can cause a stampede of DB hits.

### Read-through

The cache layer itself loads from the DB on a miss. Same behavior as cache-aside, but the logic lives in the cache library (e.g., a \`CacheLoader\`).

### Write-through

Write to cache **and** DB together, synchronously. The cache is always fresh, but every write now pays cache-write latency, and the cache stores data nobody may ever read.

### Write-back (write-behind)

Write to cache immediately; the cache asynchronously flushes to the DB in batches.

**Pros:** fast writes, fewer DB writes (batching).
**Cons:** if the cache dies before the flush, data is lost — so it's used for *loss-tolerant* data (counters, analytics) or paired with a durable write-ahead log.

### The invalidation trap

Updating the cache on write (write-through update) is more likely to cause inconsistency than **invalidating** (delete) on write. Two concurrent writers to "update" can interleave and leave stale data; delete-then-lazy-reload makes the next read fetch fresh. Prefer **invalidate on write, load on read**.

> **Gotcha:** setting a cache TTL is *not* invalidation — it just bounds staleness. Use TTLs for data that tolerates staleness, and explicit invalidation for data that must be fresh.`,
    diagram: {
      nodes: [
        { id: 'app', label: 'App', kind: 'server', x: 100, y: 200 },
        { id: 'cache', label: 'Cache', kind: 'cache', x: 340, y: 200 },
        { id: 'db', label: 'Database', kind: 'db', x: 580, y: 200 },
      ],
      edges: [
        { from: 'app', to: 'cache', label: '1. read' },
        { from: 'cache', to: 'app', label: '2a. hit' },
        { from: 'cache', to: 'db', label: '2b. miss → load' },
        { from: 'db', to: 'cache', label: '3. fill' },
        { from: 'app', to: 'db', label: 'write → invalidate' },
      ],
    },
  },
  {
    topicSlug: 'caching',
    slug: 'eviction-and-invalidation',
    title: 'Eviction, Invalidation & Cache Attacks',
    orderIndex: 1,
    bodyMd: `## When the Cache Is Full (It Always Is)

Caches are bounded, so you need an eviction policy. It's a bet on *which entries you'll need again*.

### Eviction policies

- **LRU (Least Recently Used)** — evict the oldest-access entry. Great default for most workloads; assumes recent access predicts future access.
- **LFU (Least Frequently Used)** — evict least *frequently* accessed. Better for stable popularity (videos, product pages), worse for bursts.
- **FIFO** — evict in insertion order. Simplest, ignores access patterns entirely.
- **TTL / expiration** — entries die after a time. Not an eviction policy per se, but essential to bound staleness.

Many systems combine: LRU + per-key TTL.

### Cache stampede (thundering herd)

A hot key expires → N concurrent requests all miss → N requests hit the DB → DB melts.

**Fixes:**
- **Locks / request coalescing**: one request refreshes, others wait.
- **Probabilistic early expiration**: refresh the key *before* it expires (e.g., at 90% of TTL) with a random jitter so refreshers don't synchronize.
- **Never cache with a shared exact TTL** on millions of keys created together — they'll all expire together and stampede together. Add jitter.

### Cache invalidation in distributed systems

- **Message-based invalidation**: after a DB write, emit an event; consumers delete the key. Works across services.
- **Versioned keys**: include a version/timestamp in the key (\`profile:v2:user-42\`). New version = new key; old key expires via TTL. No explicit delete needed.
- **Dual writes are dangerous**: writing both DB and cache in one transaction isn't possible across systems — one of them wins, and you get drift. Delete-on-write plus lazy reload avoids most of it.

### Cache attacks & abuse

- **Key blow-up**: caching every unique URL/query (e.g., \`cache?q=<user input>\`) lets an attacker fill memory with junk. Normalize keys and cap key cardinality.
- **Cache poisoning**: if your cache key ignores a host header or auth context, one user's data can be served to another. Keys must include everything that changes the response.
- **Memcached/Redis misconfig**: exposing cache ports publicly = data leak. Cache traffic stays on the private network.

> **Rule of thumb:** cache aggressively, invalidate explicitly, jitter your TTLs, and treat cache keys as security boundaries.`,
    diagram: {
      nodes: [
        { id: 'app', label: 'App', kind: 'server', x: 100, y: 220 },
        { id: 'redis', label: 'Cache (LRU + TTL)', kind: 'cache', x: 340, y: 220 },
        { id: 'db', label: 'Database', kind: 'db', x: 580, y: 220 },
        { id: 'evict', label: 'Eviction: LRU/LFU/FIFO', kind: 'other', x: 340, y: 80 },
        { id: 'stamp', label: 'Stampede: coalesce + jitter', kind: 'other', x: 580, y: 80 },
      ],
      edges: [
        { from: 'app', to: 'redis' },
        { from: 'redis', to: 'db' },
        { from: 'evict', to: 'redis' },
        { from: 'stamp', to: 'db' },
      ],
    },
  },
  {
    topicSlug: 'databases',
    slug: 'sql-vs-nosql',
    title: 'SQL vs NoSQL: Choosing the Right Store',
    orderIndex: 0,
    bodyMd: `## "Use Postgres" Is Not a Design

Choosing a database is choosing a *data model* plus *access pattern* plus *consistency contract*. Start from the shape of your data, not the hype.

### The families

| Family | Examples | Best for | Weakness |
|--------|----------|----------|----------|
| Relational (SQL) | Postgres, MySQL | Joins, transactions, fixed schema, money | Scaling writes is hard; rigid schema |
| Key-value | Redis, DynamoDB | Caching, sessions, lookups by key | No rich queries |
| Document | MongoDB, CouchDB | Schemaless records, nested objects | Joins are hard, multi-doc transactions painful |
| Wide-column | Cassandra, HBase | Massive write throughput, time series | Query flexibility is limited |
| Graph | Neo4j | Relationships, friend-of-friend | Awkward for other workloads |

### Relational databases are still the default

A single well-indexed Postgres handles hundreds of thousands of reads/sec with replicas, and thousands of writes/sec. Most startups' entire backend is one Postgres — and that's *correct engineering*, not laziness. Add a database only when the relational model genuinely fights you.

### NoSQL is a trade-off, not an upgrade

You give up joins and transactions to gain horizontal scaling and flexible schemas. Common rationales:

- **Document:** JSON-shaped domain objects that don't join (profiles, blog posts, product catalogs).
- **Key-value:** pure lookup workloads with strict latency budgets (sessions, carts).
- **Wide-column:** write-heavy event ingestion, time-series, or where you know the partition key in advance.
- **Graph:** traversals are the query.

### The schema trap

- Relational: schema *enforced* at write → safe but rigid.
- Document: schema enforced at *read* → flexible but every consumer must handle missing fields.

Evolve document schemas with versioned fields (\`"v": 2\`) and a migration path — "schemaless" databases still have schemas; they just moved the responsibility.

> **Interview move:** when asked "which database?", first ask *what are the access patterns?* (point reads, range scans, joins, analytics?) and *what are the consistency needs?* Then pick.`,
    diagram: {
      nodes: [
        { id: 'app', label: 'Application', kind: 'server', x: 100, y: 260 },
        { id: 'sql', label: 'SQL (Postgres)', kind: 'db', x: 340, y: 120 },
        { id: 'kv', label: 'Key-Value (Redis)', kind: 'cache', x: 340, y: 260 },
        { id: 'doc', label: 'Document (Mongo)', kind: 'db', x: 340, y: 400 },
        { id: 'wide', label: 'Wide-Column (Cassandra)', kind: 'db', x: 600, y: 400 },
        { id: 'graph', label: 'Graph (Neo4j)', kind: 'db', x: 600, y: 120 },
      ],
      edges: [
        { from: 'app', to: 'sql' },
        { from: 'app', to: 'kv' },
        { from: 'app', to: 'doc' },
        { from: 'app', to: 'wide' },
        { from: 'app', to: 'graph' },
      ],
    },
  },
  {
    topicSlug: 'databases',
    slug: 'indexes-and-scale',
    title: 'Indexes, Connection Pooling & Read Replicas',
    orderIndex: 1,
    bodyMd: `## Why Your DB Is Slow: It's Almost Never the Hardware

Most "database performance" problems are index, query, or connection problems. Fix those first.

### Indexes: B-Tree vs LSM

- **B-Tree** (Postgres, MySQL, SQLite): ordered tree on disk. Great for range scans and point lookups; every insert may cause page splits (random writes).
- **LSM-Tree** (Cassandra, RocksDB, LevelDB): writes go to an in-memory memtable, flushed to sorted SSTables, compacted in the background. *Sequential* writes → excellent write throughput; reads may need to check multiple files (compaction helps).

| | B-Tree | LSM |
|---|---|---|
| Writes | Random (page splits) | Sequential, batched |
| Reads | Fast, predictable | Slightly slower, check multiple levels |
| Compaction | In-place | Background merge |

### Composite indexes & "leftmost prefix"

An index on \`(country, city, street)\` helps queries filtering on \`country\`, \`(country, city)\`, or \`(country, city, street)\` — but **not** \`city\` alone. Order columns by selectivity, then by equality-before-range.

### The cardinal sin: no index on the hot column

A point lookup scanning the whole table at 100k QPS is the fastest way to burn the disk. \`EXPLAIN\` your hot queries; add indexes for them; drop indexes nobody uses (each index slows writes).

### Connection pooling

Databases accept a limited number of connections. Opening a TCP + auth handshake per request is wasteful.

- Use a **pool** (e.g., pgbouncer, HikariCP): a fixed set of long-lived connections shared across requests.
- Pool too small → requests queue; pool too large → DB thrashes on context switches. Monitor *connection wait time*.

### Read replicas

Replicate the primary to read-only replicas; route read traffic there.

- **Scales reads**, not writes — the primary still takes all writes.
- **Replication lag** means a user's own write may not be visible on a replica immediately. Solve with **read-your-writes**: route reads that must see the user's latest write to the primary, or use session stickiness.
- Replicas also give you a **failover** candidate — but promoting a lagging replica can lose acknowledged writes.

> **Senior answer:** before adding a cache or sharding, run the three cheapest wins: index the hot query, pool connections, and offload reads to replicas. Then reach for a cache. Sharding is last.`,
    diagram: {
      nodes: [
        { id: 'app', label: 'App', kind: 'server', x: 100, y: 260 },
        { id: 'pool', label: 'Connection Pool', kind: 'lb', x: 300, y: 260 },
        { id: 'pri', label: 'Primary (writes)', kind: 'db', x: 520, y: 120 },
        { id: 'rep1', label: 'Replica 1 (reads)', kind: 'db', x: 520, y: 300 },
        { id: 'rep2', label: 'Replica 2 (reads)', kind: 'db', x: 520, y: 440 },
      ],
      edges: [
        { from: 'app', to: 'pool' },
        { from: 'pool', to: 'pri', label: 'INSERT/UPDATE' },
        { from: 'pool', to: 'rep1', label: 'SELECT' },
        { from: 'pool', to: 'rep2', label: 'SELECT' },
        { from: 'pri', to: 'rep1', label: 'replication' },
        { from: 'pri', to: 'rep2', label: 'replication' },
      ],
    },
  },
  {
    topicSlug: 'sharding-and-partitioning',
    slug: 'partitioning-strategies',
    title: 'Partitioning Strategies',
    orderIndex: 0,
    bodyMd: `## Range, Hash, or Directory?

Sharding (partitioning) splits a dataset across machines so each holds a slice. The strategy you pick determines the queries that work, the rebalance pain, and the hot-spot risk.

### Range partitioning

Split by a key's *order* (e.g., \`user_id\` 1–100k on shard 0, 100k–200k on shard 1).

**Pros:** range scans work naturally (time-series: all of Tuesday lives together); great for ordering queries.
**Cons:** **hot shards** — new users or "today's" data pile onto one shard; uneven distribution unless keys are uniform.

### Hash partitioning

Compute \`hash(key) % N\` to pick a shard.

**Pros:** keys spread uniformly → balanced load.
**Cons:** range queries become scatter-gather (a range scan hits every shard); resharding changes N and remaps *all* keys.

### Directory-based (lookup table)

A central mapping service decides which shard holds a key.

**Pros:** flexible, supports custom placement (geo, tenant isolation).
**Cons:** the directory is a hot path and a single point of failure (cache it, replicate it).

### Choosing a partition key

The golden rule: **choose the key that your most common access pattern filters on.**

- Multi-tenant SaaS: partition by \`tenant_id\` — all of a tenant's data on one shard, so joins and transactions stay local.
- Chat: partition by \`conversation_id\` — all messages of one chat on one shard.
- Feed: partition by \`user_id\` — a user's timeline stays together.

### Secondary indexes across shards

A local index only covers its shard. Global queries (e.g., "find users by email") need a **global secondary index** — a separate index table, itself partitioned, that maps the secondary key to a primary key. Keep it consistent with the source (async or sync depending on the criticality).

> **Tricky bit:** you cannot arbitrarily choose a new partition key after launch — migrating data across shards at scale is a multi-week operation. Pick the key that matches your dominant access pattern *now*, and design so it's still right in 3 years.`,
    diagram: {
      nodes: [
        { id: 'app', label: 'App', kind: 'server', x: 100, y: 260 },
        { id: 'router', label: 'Partitioner (hash/range)', kind: 'lb', x: 320, y: 260 },
        { id: 's0', label: 'Shard 0', kind: 'db', x: 560, y: 100 },
        { id: 's1', label: 'Shard 1', kind: 'db', x: 560, y: 260 },
        { id: 's2', label: 'Shard 2', kind: 'db', x: 560, y: 420 },
      ],
      edges: [
        { from: 'app', to: 'router' },
        { from: 'router', to: 's0', label: 'hash(u)%3 = 0' },
        { from: 'router', to: 's1', label: 'hash(u)%3 = 1' },
        { from: 'router', to: 's2', label: 'hash(u)%3 = 2' },
      ],
    },
  },
  {
    topicSlug: 'sharding-and-partitioning',
    slug: 'consistent-hashing-and-hot-keys',
    demo: 'consistent-hashing',
    title: 'Consistent Hashing, Rebalancing & Hot Keys',
    orderIndex: 1,
    bodyMd: `## Why "hash % N" Breaks, and What We Do Instead

\`hash(key) % N\` maps a key to one of N shards. The moment N changes (add/remove a machine), nearly *every* key moves. Consistent hashing keeps most keys in place.

### Consistent hashing

- Hash keys and shards onto a circular ring of \`[0, 2³²)\`.
- A key lives on the first shard clockwise from its position.
- Adding/removing a shard only moves the keys that hash to the empty arc — a **small fraction**, not everything.

**Virtual nodes** (each physical machine owns many points on the ring) smooth out the distribution so a few machines don't end up owning giant arcs.

### Rebalancing without downtime

Even with consistent hashing you must move data. Patterns:

- **Steady rebalance**: migrate shards in the background, shard-by-shard, throttled.
- **Double-write during migration**: write to old + new shard, then cut reads, then drop the old.
- **Hot-swap via replicas**: bring up a fully replicated replacement before removing the old node.

### Hot keys & hot shards

Consistent hashing balances by *key* — but one popular key (a viral video, a celebrity user) can still pin a single shard to 100% CPU. Classic fixes:

- **Replicate the hot key**: maintain K replicas of the same key on K shards; readers pick one at random. Writes must update all K (or use quorum).
- **Local cache in front of the shard**: absorb the reads before they hit the disk.
- **Split the key into K sub-keys** (e.g., \`user:42:0..K-1\`) — but then reads must merge, so only do this for mergeable data (like counters).

### Shard count sizing

- Over-provision: plan for 3–5× today's growth so you rebalance rarely.
- Keep shards small enough to rebalance fast and back up quickly, but few enough to keep connection overhead manageable. Hundreds of medium shards beats 5 giant ones.

> **Key idea:** sharding wins you capacity but costs you *queries* (cross-shard joins die) and *operations* (rebalancing). Consistent hashing reduces the pain; hot-key handling is where senior engineers earn their pay.`,
    diagram: {
      nodes: [
        { id: 'ring', label: 'Hash ring', kind: 'other', x: 200, y: 260 },
        { id: 'n1', label: 'Node A', kind: 'db', x: 440, y: 120 },
        { id: 'n2', label: 'Node B', kind: 'db', x: 440, y: 260 },
        { id: 'n3', label: 'Node C', kind: 'db', x: 440, y: 400 },
        { id: 'hot', label: 'Hot key → K replicas', kind: 'cache', x: 720, y: 260 },
      ],
      edges: [
        { from: 'ring', to: 'n1' },
        { from: 'ring', to: 'n2' },
        { from: 'ring', to: 'n3' },
        { from: 'ring', to: 'hot' },
      ],
    },
  },
  {
    topicSlug: 'replication-and-consensus',
    slug: 'replication-topologies',
    title: 'Replication Topologies',
    orderIndex: 0,
    bodyMd: `## Leader, Multi-Leader, Leaderless — Pick Your Poison

Replication copies data to multiple machines for **durability** (survive a disk loss), **read scaling**, and **geo-locality**. The topology decides who may write.

### Single-leader (primary/secondary)

One node accepts writes; replicas apply the same log.

- **Sync replication**: primary waits for a replica to ack — zero data loss on failure, but a slow replica stalls every write.
- **Async replication**: primary acks immediately — fast, but a primary crash can lose acknowledged writes.
- **Semi-sync**: wait for at least one replica — the common compromise.

**Read-your-writes** becomes a problem: the user writes to the primary, reads from a lagging replica, and their data is "missing". Route those reads to the primary.

### Multi-leader

Multiple nodes accept writes (e.g., per region) and replicate to each other. Low write latency per region, but **conflicts** (same record edited in two regions) must be resolved — last-write-wins, merge semantics, or app-level resolution. Used when the alternative (one faraway primary) is worse.

### Leaderless (Dynamo-style)

Any replica accepts reads and writes. Quorum: \`W\` replicas must ack a write, \`R\` must agree on a read, with \`W + R > N\` (total replicas) guaranteeing at least one node holds the newest value.

- **Read repair**: a stale replica is updated in the background after a read.
- **Anti-entropy**: background process reconciles divergent replicas with vector clocks.
- Slower writes (need \`W\` acks), more client complexity.

### Replication is not a backup

Replication guards against node loss but not against **bad data**: a runaway \`DELETE\` replicates everywhere instantly. For backup you need point-in-time recovery and a *separate* copy that nothing writes to.

> **Gotcha:** async replicas that lag far behind make a "failover" lose acknowledged writes. Monitor replica lag and treat it as a first-class alert — lagging replicas are the leading cause of "our failover lost data."`,
    diagram: {
      nodes: [
        { id: 'client', label: 'Clients', kind: 'client', x: 80, y: 260 },
        { id: 'leader', label: 'Leader (writes)', kind: 'db', x: 320, y: 260 },
        { id: 'f1', label: 'Follower 1 (sync)', kind: 'db', x: 560, y: 120 },
        { id: 'f2', label: 'Follower 2 (async)', kind: 'db', x: 560, y: 400 },
      ],
      edges: [
        { from: 'client', to: 'leader', label: 'INSERT' },
        { from: 'client', to: 'f1', label: 'SELECT' },
        { from: 'client', to: 'f2', label: 'SELECT' },
        { from: 'leader', to: 'f1', label: 'log apply (sync)' },
        { from: 'leader', to: 'f2', label: 'log apply (async)' },
      ],
    },
  },
  {
    topicSlug: 'replication-and-consensus',
    slug: 'consensus-and-split-brain',
    title: 'Consensus & Split Brain',
    orderIndex: 1,
    bodyMd: `## The Hardest Part of Distributed Systems: Agreeing on Facts

When multiple nodes can fail independently, they must still agree on *who is the leader*, *which value is committed*, and *when it is safe to proceed*. That's **consensus**.

### Split brain

If the leader becomes unreachable and a replica takes over while the old leader is still alive (just isolated), you have **two leaders**. Both accept writes → data diverges → users see the wrong state.

**Prevention:**

- **Quorum**: a write/leader-election needs a strict majority (\`N/2 + 1\`) of nodes. Only one partition can hold a majority, so only one can proceed.
- **Fencing tokens**: a new leader increments a token; the old leader's requests carry stale tokens and are rejected by the storage layer. This stops the old leader from corrupting shared state even if it's alive.

### Quorum arithmetic

With 3 nodes and \`W=2, R=2\`: a write needs 2 acks, a read needs 2 nodes. Any read overlaps any write on at least one node → linearizable reads. If you lower to \`W=1\`, you lose that guarantee.

### Raft & Paxos (the short version)

Both solve the same problem: a set of nodes reliably agree on a sequence of values (the replicated log).

- **Paxos** — elegant but famously hard to implement correctly.
- **Raft** — makes consensus *understandable*: leader election by randomized timeouts, log replication, and commit only after a majority confirms.

You almost never implement either yourself. You use **ZooKeeper**, **etcd**, or **Consul** — small consensus clusters that other systems depend on (service discovery, leader election, distributed locks, config).

### The availability cost

Consensus requires a *majority* — a 3-node cluster tolerates 1 failure; a 5-node cluster tolerates 2. With 2 nodes you tolerate **zero** (there's no majority left), which is why you never run a "replicated" 2-node cluster as if it were HA.

> **Interview trap:** "add a replica for high availability" — with a 2-node setup and no quorum design, losing one node takes you down *and* risks split brain. Replication without a quorum strategy is not high availability.`,
    diagram: {
      nodes: [
        { id: 'old', label: 'Old leader (isolated)', kind: 'db', x: 120, y: 140 },
        { id: 'new', label: 'New leader (majority)', kind: 'db', x: 380, y: 140 },
        { id: 'f1', label: 'Follower', kind: 'db', x: 260, y: 320 },
        { id: 'f2', label: 'Follower', kind: 'db', x: 500, y: 320 },
        { id: 'fence', label: 'Fencing tokens reject stale leader', kind: 'other', x: 720, y: 220 },
      ],
      edges: [
        { from: 'old', to: 'fence', label: 'stale writes' },
        { from: 'new', to: 'f1' },
        { from: 'new', to: 'f2' },
        { from: 'f1', to: 'fence' },
        { from: 'f2', to: 'fence' },
      ],
    },
  },
  {
    topicSlug: 'message-queues-and-async',
    slug: 'why-async-and-how-it-scales',
    title: 'Why Async, and How It Scales',
    orderIndex: 0,
    bodyMd: `## The Fastest Request Is the One You Don't Process

Synchronous design couples the caller's latency to the callee's. Asynchronous design decouples them with a **queue** — the caller returns immediately, and work happens in the background.

### What a queue buys you

- **Decoupling**: producer and consumer scale and deploy independently. The producer doesn't care how many consumers exist.
- **Load leveling / buffering**: a spike of 100k requests doesn't melt consumers; they drain at their own pace. The queue absorbs the burst.
- **Retry isolation**: a failed task stays in the queue (or a DLQ) instead of failing the whole request.
- **Time shifting**: expensive or slow work (emails, thumbnails, analytics) happens after the response is already sent.

### Backpressure

If consumers can't keep up, the queue grows without bound. Real systems:

- Monitor **queue depth** as a first-class metric.
- If depth grows, scale consumers horizontally — this only works if consumers are **idempotent** and work is partitioned correctly.
- Cap the queue and shed or reject rather than buffering forever (a dead-letter queue for poison messages that keep failing).

### Delivery semantics (this is where it gets tricky)

| Semantics | What it means | Cost |
|-----------|---------------|------|
| At-most-once | Message may be lost | Fast, but data loss |
| At-least-once | Message may repeat | Need idempotent consumers |
| Exactly-once | No loss, no duplicates | Expensive (txns, dedupe) |

Most systems run **at-least-once** and make consumers **idempotent** (processing the same message twice is harmless). "Exactly-once" in practice is at-least-once plus dedup and idempotency on the consumer side.

### The trap of synchronous thinking

If your "queue" still makes the caller wait for the consumer (request-reply over a queue), you've just added latency without decoupling. True async means the caller treats the response as "accepted", not "done".

> **Key idea:** choose the point of async carefully. Turn the *slowest, least-critical* steps async first — emails, notifications, analytics — and keep the latency-critical path synchronous.
`,
    diagram: {
      nodes: [
        { id: 'prod', label: 'Producer', kind: 'server', x: 100, y: 200 },
        { id: 'q', label: 'Queue', kind: 'queue', x: 320, y: 200 },
        { id: 'c1', label: 'Consumer 1', kind: 'server', x: 560, y: 120 },
        { id: 'c2', label: 'Consumer 2', kind: 'server', x: 560, y: 280 },
        { id: 'dlq', label: 'Dead-letter queue', kind: 'queue', x: 780, y: 200 },
      ],
      edges: [
        { from: 'prod', to: 'q', label: 'publish' },
        { from: 'q', to: 'c1', label: 'consume' },
        { from: 'q', to: 'c2', label: 'consume' },
        { from: 'c1', to: 'dlq', label: 'retry → poison' },
        { from: 'c2', to: 'dlq', label: 'retry → poison' },
      ],
    },
  },
  {
    topicSlug: 'message-queues-and-async',
    slug: 'kafka-and-delivery-semantics',
    title: 'Kafka-Style Systems & Delivery Semantics',
    orderIndex: 1,
    bodyMd: `## Kafka Is Not a "Message Queue" — It's a Log

RabbitMQ and Kafka are both "messaging", but they're structurally different.

### Broker queue (RabbitMQ-style)

Messages are removed when consumed. Good for **task distribution** — each task is processed exactly once (semantics permitting) by exactly one consumer. This is your work queue for emails, image resizing, etc.

### Distributed log (Kafka-style)

Messages are **appended to a partitioned, replicated log** and *retained* for a window. Consumers track an **offset** into the log and can re-read. This is a durable, replayable event stream.

### Kafka concepts in 60 seconds

- **Topic** = named stream. **Partition** = unit of parallelism and ordering (per-partition ordering is guaranteed, not cross-partition).
- **Partition key** → all messages with the same key land in the same partition (so all events for \`user_id=42\` stay ordered).
- **Consumer group** = N consumers splitting the partitions between them. More consumers than partitions = idle consumers (parallelism is bounded by partition count).
- **Replication factor** = copies across brokers for durability.

### What Kafka is good for

- **Event sourcing / streaming pipelines** — user actions → analytics, feature flags, recommendations.
- **Data fan-out** — one event consumed by many independent services (audit, search index, ML, billing).
- **Replay** — reprocess history (fix a bug in a consumer, replay the last day).

### Delivery semantics in practice

- Producer: an **ack from the broker** (not just "sent") confirms persistence. Retries on ack timeout; use an idempotent producer to avoid duplicates on retry.
- Consumer: commit the offset **after** processing, not before. Commit-then-crash → the message repeats (at-least-once); process-then-commit, crash before commit → repeats too. The only way to not repeat is idempotent processing or transactional outbox.
- **Exactly-once** = idempotent producer + transactional reads/writes + dedup. Expensive; usually overkill.

### Outbox pattern

Writing to a DB *and* publishing an event can't be one transaction across systems. **Outbox**: write the event to the same DB table as your business data in one local transaction; a relay reads the outbox and publishes to the broker. This makes the event publication reliable without distributed transactions.

> **Gotcha:** "at-least-once" is the honest default for almost every Kafka setup. Design consumers to be idempotent and you get exactly-once *behavior* without paying for exactly-once machinery.`,
    diagram: {
      nodes: [
        { id: 'svc', label: 'Service', kind: 'server', x: 80, y: 200 },
        { id: 'outbox', label: 'Outbox (DB)', kind: 'db', x: 260, y: 200 },
        { id: 'topic', label: 'Topic (partitioned log)', kind: 'queue', x: 470, y: 200 },
        { id: 'g1', label: 'Consumer A', kind: 'server', x: 680, y: 100 },
        { id: 'g2', label: 'Consumer B', kind: 'server', x: 680, y: 300 },
      ],
      edges: [
        { from: 'svc', to: 'outbox', label: 'local txn' },
        { from: 'outbox', to: 'topic', label: 'relay publishes' },
        { from: 'topic', to: 'g1', label: 'offset' },
        { from: 'topic', to: 'g2', label: 'offset' },
      ],
    },
  },
  {
    topicSlug: 'microservices-and-api-design',
    slug: 'monolith-to-microservices',
    title: 'Monolith to Microservices',
    orderIndex: 0,
    bodyMd: `## You Don't Start With Microservices

A monolith is a single deployable unit. It's the *correct* starting point: simple deploys, no network calls between features, one database, easy refactoring.

### When the monolith hurts

- **Team scaling**: 20 teams can't all ship to the same deployable without coordination hell.
- **Isolation**: one memory-hungry feature takes down everything.
- **Technology mix**: you want Go for the image pipeline but the monolith is Java.

### The modular monolith (the forgotten middle step)

Keep one deployable but enforce *module boundaries* in code: each module owns its data and exposes a clean interface. You get most of the discipline of microservices without the distributed-system tax. Split into microservices only when the modular monolith can't hold.

### Service boundaries: the data is the boundary

The worst microservice is a *shared-database* microservice — two services reading/writing the same tables are one service with extra steps.

**Rules of thumb:**
- One service owns one data domain; other services reach it via its API.
- Communication happens via events or APIs, never via direct DB access.
- Transactions don't span services — use sagas or event-driven eventual consistency.

### Orchestration vs choreography

| | Orchestration | Choreography |
|---|---|---|
| How | A central coordinator calls services | Services react to events |
| Coupling | Tight (coordinator knows everything) | Loose (services unaware of each other) |
| Visibility | Easy to trace a flow | Flow is implicit in event topology |
| Failure | Coordinator is a single point | Harder to reason about, easier to debug events |

Start with orchestration for business-critical sequences (order → payment → shipping); use choreography for fan-out (order-placed → email + analytics + search index).

### The hidden costs

Every microservice is a network boundary: latency, timeouts, partial failures, serialization, versioning, observability, and team-ownership coordination. If you can't answer *what each service is for* and *who owns its data*, you don't have microservices — you have a distributed monolith.

> **Senior answer to "should we go microservices?":** "Not yet. Here's what breaks today, and here's the module boundary that fixes it. We split when the modular monolith stops scaling our teams."`,
    diagram: {
      nodes: [
        { id: 'client', label: 'Client', kind: 'client', x: 80, y: 260 },
        { id: 'order', label: 'Order Service', kind: 'server', x: 280, y: 120 },
        { id: 'pay', label: 'Payment Service', kind: 'server', x: 280, y: 260 },
        { id: 'ship', label: 'Shipping Service', kind: 'server', x: 280, y: 400 },
        { id: 'evt', label: 'Event Bus', kind: 'queue', x: 520, y: 260 },
        { id: 'email', label: 'Email Svc', kind: 'server', x: 700, y: 120 },
        { id: 'search', label: 'Search Svc', kind: 'server', x: 700, y: 400 },
      ],
      edges: [
        { from: 'client', to: 'order' },
        { from: 'client', to: 'pay' },
        { from: 'client', to: 'ship' },
        { from: 'order', to: 'evt', label: 'order.placed' },
        { from: 'pay', to: 'evt', label: 'payment.succeeded' },
        { from: 'ship', to: 'evt', label: 'shipment.created' },
        { from: 'evt', to: 'email' },
        { from: 'evt', to: 'search' },
      ],
    },
  },
  {
    topicSlug: 'microservices-and-api-design',
    slug: 'api-design-rest-graphql-grpc',
    title: 'API Design: REST, GraphQL & gRPC',
    orderIndex: 1,
    bodyMd: `## Three Styles, Three Contracts

APIs are the contract between your services and the world. The style you choose changes how consumers evolve with you.

### REST (resource-based)

Resources + verbs (GET/PUT/POST/DELETE) + status codes + pagination.

- **Great for:** public APIs, caching-friendly (HTTP caches work), tooling everywhere.
- **Watch out:** over-fetching (you get a whole resource when you need 2 fields), N+1 (client calls /users then /users/:id/posts), and versioning pain.

### GraphQL (query language)

One endpoint; the client *selects* exactly the fields it wants.

- **Great for:** mobile apps (fewer round trips, no over-fetching), rapidly changing client requirements.
- **Costs:** server-side complexity (resolvers, N+1 prevention via DataLoader), caching is harder (no natural HTTP cache keys), and a maliciously deep query can DoS the server (need query depth/complexity limits).

### gRPC (typed, binary RPC)

Protobuf-defined service contracts, HTTP/2, streaming, code generation.

- **Great for:** internal service-to-service calls — fast, typed, supports bidirectional streaming.
- **Costs:** tooling (protobuf build step), debugging binary payloads, poor browser support (needs gRPC-Web / proxies).

### Versioning

- **Prefer additive evolution**: add fields/endpoints, never remove or reinterpret.
- **URL versioning** (\`/v2/users\`) is simplest and honest; header/content-negotiation versioning keeps URLs clean but is invisible in logs.
- Deprecate with a documented sunset policy and telemetry on old versions.

### Idempotency & retries

Distributed calls **will** retry (timeouts, load balancer failovers). If a client retries a payment POST, you must not charge twice.

- Idempotency key: client sends \`Idempotency-Key\`; server stores (key → result) and returns the same result on retry.
- Prefer PUT (idempotent by definition) over POST for state-setting.

### Pagination & rate limiting

- Cursor-based pagination (\`?cursor=...\`) beats offset for large, changing datasets (no "pages shift when someone deletes row 5").
- Rate limit per API key/user with token-bucket; return \`Retry-After\` and 429.

> **Interview move:** name the trade-off per style and justify the choice from the *consumers'* needs, not fashion: "REST for the public API, gRPC inside the cluster, and a thin GraphQL BFF for the mobile app."`,
    diagram: {
      nodes: [
        { id: 'mobile', label: 'Mobile app', kind: 'client', x: 100, y: 100 },
        { id: 'web', label: 'Web app', kind: 'client', x: 100, y: 260 },
        { id: 'gw', label: 'API Gateway', kind: 'lb', x: 320, y: 180 },
        { id: 'rest', label: 'REST public', kind: 'server', x: 540, y: 80 },
        { id: 'graphql', label: 'GraphQL BFF', kind: 'server', x: 540, y: 220 },
        { id: 'grpc', label: 'gRPC internal', kind: 'server', x: 540, y: 360 },
      ],
      edges: [
        { from: 'mobile', to: 'gw' },
        { from: 'web', to: 'gw' },
        { from: 'gw', to: 'graphql' },
        { from: 'graphql', to: 'rest' },
        { from: 'graphql', to: 'grpc' },
        { from: 'rest', to: 'grpc' },
      ],
    },
  },
  {
    topicSlug: 'cdn-and-edge',
    slug: 'cdn-fundamentals',
    title: 'CDN Fundamentals',
    orderIndex: 0,
    bodyMd: `## Push the Static, Think Hard About the Dynamic

A CDN is a network of edge servers that cache content close to users. It cuts latency (shorter network paths) and offloads your origin servers (fewer requests hit them).

### CDN flow

1. User's DNS resolves to the **nearest edge** (geo-DNS / anycast).
2. Edge checks its cache.
3. Miss → edge fetches from the **origin** (your server or object storage), caches it, returns it.
4. Subsequent users in that region get served from the edge.

### Cache-control: the whole game is headers

The origin tells the edge *how long* to cache via HTTP headers:

- \`Cache-Control: public, max-age=3600\` — cache anywhere for an hour.
- \`private\` — don't cache in shared caches (personalized responses).
- \`no-store\` — never cache (bank balances, CSRF tokens).
- \`ETag\` / \`Last-Modified\` — enable **revalidation**: the edge asks "is this still fresh?" with a cheap conditional request instead of re-downloading.

### Push vs pull

- **Pull (CDN fetches from origin):** automatic, self-healing; first request is a miss. Best default.
- **Push (you upload files to the CDN):** no cold misses, you control exactly what's cached. Good for large, known assets (video, installers).

### Invalidation

You changed \`app.js\` but the CDN still serves the old copy for 24h.

- **Cache-busting**: fingerprint filenames — \`app.a1b2c3.js\` — so a new build is a new URL. Never mutate an already-deployed asset URL.
- **Explicit invalidation**: purge URLs via the CDN API — instant but has costs and takes time to propagate globally.
- **Short TTLs on HTML**, long TTLs on fingerprinted assets: HTML references the asset URLs, so HTML needs freshness while the assets can sit forever.

### Dynamic content on the edge

- **Edge caching of dynamic content**: cache *responses keyed by* the variation (e.g., by language, region, A/B bucket). Works for public pages with \`public, max-age\` and Vary headers.
- **Edge compute** (Cloudflare Workers, Lambda@Edge): run code at the edge — rewrite HTML, serve personalized headers, do geo-specific logic without a round trip to origin.

### What a CDN does NOT fix

- It does not fix a slow *origin* for uncacheable content (anything personalized).
- It adds a cache layer — **cache poisoning / key confusion** (serving user A's personalized page to user B) happens when cache keys don't include everything the response depends on.

> **Rule of thumb:** fingerprint static assets with long TTLs, keep HTML short-TTL, revalidate with ETags, and never cache anything that depends on the logged-in user.`,
    diagram: {
      nodes: [
        { id: 'user', label: 'User (NY)', kind: 'client', x: 80, y: 120 },
        { id: 'edge1', label: 'Edge (NY)', kind: 'cdn', x: 300, y: 120 },
        { id: 'user2', label: 'User (Tokyo)', kind: 'client', x: 80, y: 320 },
        { id: 'edge2', label: 'Edge (Tokyo)', kind: 'cdn', x: 300, y: 320 },
        { id: 'origin', label: 'Origin / Object Store', kind: 'server', x: 560, y: 220 },
      ],
      edges: [
        { from: 'user', to: 'edge1' },
        { from: 'edge1', to: 'origin', label: 'cache miss' },
        { from: 'user2', to: 'edge2' },
        { from: 'edge2', to: 'origin', label: 'cache miss' },
      ],
    },
  },
  {
    topicSlug: 'cdn-and-edge',
    slug: 'dns-routing-and-edge-compute',
    title: 'DNS Routing & Edge Compute',
    orderIndex: 1,
    bodyMd: `## DNS Is Your First Load Balancer

Before a single byte reaches your infra, **DNS** decides which IP the user's client connects to. It resolves in layers — recursive resolver → root → TLD → authoritative nameserver — with caching at every step. Two strategies route traffic from DNS:

- **GeoDNS** — the authoritative server returns a *different IP per client location*. Simple, but resolution happens at the user's **resolver**, not their device: VPNs and shared resolvers (8.8.8.8) can send a user to the wrong region.
- **Anycast** — the *same IP* is announced from many locations, and BGP routing sends each user to the nearest node. No location guessing, and automatic failover: a dead PoP simply stops being advertised. This is how Cloudflare, Fastly, and the root DNS servers work.

### DNS TTL is your blast radius

\`TTL\` controls how long resolvers cache a record. A 60-second TTL means you can move traffic to a new region in a minute; a 24-hour TTL means a bad record sticks for a day. **You cannot change infrastructure faster than DNS TTL** — plan failover and cutovers around it.

## Edge Compute: Code at the PoP

The modern edge is not just a cache — it runs your code in every PoP (Cloudflare Workers, Lambda@Edge, CloudFront Functions). What belongs at the edge:

- **Response rewriting** — transform HTML/JS, resize images, inject headers without an origin round-trip.
- **Geo/personalization** — country code, language, A/B variant selected as close to the user as possible.
- **Security & rate limiting** — WAF rules, bot detection, and per-IP throttling absorb attacks *before* they reach your origin. This is why DDoS traffic rarely touches your servers.
- **Dynamic assembly** — fetch fragments from several origins and stitch them at the edge, collapsing the *user's* network distance to *your* backend.

**Edge limits:** runtimes are constrained (CPU ms, memory caps, no shared state between PoPs). The edge is a *stateless function layer*, not a database — long-lived state stays at origin; the edge makes fast decisions and delegates.

## The Modern Architecture

\`\`\`
user → DNS (Geo/Anycast) → Edge (cache + Workers) → Origin (app) → DB
\`\`\`

Cacheable content never reaches origin. Dynamic requests ride a network path optimized by the edge. Security terminates at the edge, where the DDoS bandwidth actually is.

> **Rule of thumb:** move *everything cheap and location-dependent* to the edge — caching, TLS, auth checks, rewrites — and keep *everything stateful and authoritative* at origin. The edge converts network distance into compute; use it for exactly that.`,
    diagram: {
      nodes: [
        { id: 'user', label: 'User', kind: 'client', x: 80, y: 220 },
        { id: 'dns', label: 'DNS\nGeoDNS / Anycast', kind: 'other', x: 280, y: 60 },
        { id: 'edge', label: 'Edge PoP\ncache + Workers', kind: 'cdn', x: 280, y: 240 },
        { id: 'waf', label: 'WAF / rate limit', kind: 'lb', x: 280, y: 400 },
        { id: 'origin', label: 'Origin (app)', kind: 'server', x: 540, y: 240 },
        { id: 'db', label: 'Database', kind: 'db', x: 760, y: 240 },
      ],
      edges: [
        { from: 'user', to: 'dns', label: 'resolve' },
        { from: 'dns', to: 'edge', label: 'nearest IP' },
        { from: 'user', to: 'waf', label: 'https' },
        { from: 'waf', to: 'edge' },
        { from: 'edge', to: 'origin', label: 'miss / dynamic' },
        { from: 'origin', to: 'db' },
      ],
    },
  },
  {
    topicSlug: 'observability-and-reliability',
    slug: 'the-three-pillars',
    title: 'The Three Pillars: Logs, Metrics, Traces',
    orderIndex: 0,
    bodyMd: `## If You Can't See It, You Can't Fix It

Observability is the ability to ask *arbitrary* questions about a system's behavior from its outputs. Three signals cover most questions:

### 1. Logs (events)

Timestamped records of what happened: request lines, errors, audit events.

- **Structured logs** (JSON) over free text — they're queryable.
- Logs are *expensive*: sample debug logs, always keep error/warn, and don't log secrets or PII bodies.
- Centralize (ELK/Loki + a query layer) and set a retention policy.

### 2. Metrics (numbers over time)

Time-series counters/gauges/histograms: QPS, latency, error rate, queue depth, CPU.

- **RED** (for request-driven services): *Rate, Errors, Duration*.
- **USE** (for resources): *Utilization, Saturation, Errors* — CPU, memory, disk, connections.
- Histograms (percentiles) beat averages for latency — the P99 is what users feel.

### 3. Traces (request flow across services)

A single user request fans out across services; a **trace** with a shared \`trace_id\` connects them.

- Each service emits **spans** (name, start/end, parent link, metadata).
- Answers: *where* did the extra 900ms go? Which dependency is slow or failing?
- Use distributed tracing headers (\`traceparent\`) propagated through APIs and queues.

### The fourth pillar (people forget it): alerting

Signals are useless if nobody acts:

- Alert on **SLI burn** (error budget consumed), not on every anomaly.
- Alerts must be *actionable*: a good alert says what's wrong, who's affected, and what to check first. An alert with no runbook is noise.
- Define severity + escalation, and page for things that hurt users *now* — not for cosmetic dashboard noise.

### Context is the multiplier

Metrics answer "is it broken?", logs answer "what happened?", traces answer "where?". Correlate them with a common \`request_id\`/trace id through the stack — that's what makes each signal individually far more powerful.

> **Key idea:** logging alone is not observability. You need the *three* signals plus alerting wired to a runbook, or you'll debug a production incident in the dark.`,
    diagram: {
      nodes: [
        { id: 'svc', label: 'Service', kind: 'server', x: 120, y: 260 },
        { id: 'logs', label: 'Logs (events)', kind: 'db', x: 380, y: 100 },
        { id: 'metrics', label: 'Metrics (RED/USE)', kind: 'db', x: 380, y: 260 },
        { id: 'traces', label: 'Traces (spans)', kind: 'db', x: 380, y: 420 },
        { id: 'alert', label: 'Alerting (SLO burn)', kind: 'other', x: 660, y: 260 },
      ],
      edges: [
        { from: 'svc', to: 'logs' },
        { from: 'svc', to: 'metrics' },
        { from: 'svc', to: 'traces' },
        { from: 'metrics', to: 'alert' },
      ],
    },
  },
  {
    topicSlug: 'observability-and-reliability',
    slug: 'reliability-engineering',
    title: 'Reliability Engineering: SLOs, Failover & DR',
    orderIndex: 1,
    bodyMd: `## Reliability Is a Product Decision

Perfect uptime costs infinity. The SRE discipline makes reliability *negotiated*: you pick targets, measure them, and spend effort where the risk is.

### SLI → SLO → error budget

- **SLI**: the actual measurement — e.g., "proportion of requests completing in < 200 ms".
- **SLO**: the target you commit to — e.g., "99.9% of requests under 200 ms per month".
- **Error budget**: \`100% − SLO\` = how much badness you're *allowed*. If you've burned it, you stop risky releases and focus on stability.

A good SLO is *user-meaningful*: measure the user's path (checkout, timeline load), not your internal health pings.

### Failover strategies

- **Active-passive**: standby only takes over on failure. Cheaper; failover time is non-zero (RTO = recovery time objective).
- **Active-active**: all regions serve traffic; DNS/LB shifts load on failure. Better latency and no idle capacity, but needs conflict handling (multi-leader) and per-region independence.

Failover is a *procedure*, not a config: it must be tested regularly (chaos drills, game days). An untested failover path will fail exactly when you need it.

### Disaster recovery (DR)

The questions to answer *before* an outage:

- **RPO** (Recovery Point Objective): how much data can you afford to lose? (5 min of logs? 1 day of metrics?)
- **RTO** (Recovery Time Objective): how long can the system be down before it's "acceptable"?

| DR tier | RPO | RTO | Cost |
|---------|-----|-----|------|
| Backup + restore | Hours | Hours–days | Low |
| Warm standby (replicated, scaled down) | Minutes | Minutes–hours | Medium |
| Active-active multi-region | Seconds–0 | Seconds | High |

Backups are not DR: without a tested restore, "we have backups" is fiction. Restore drills matter more than backup size.

### Chaos & game days

Deliberately break things in staging (kill a node, cut a region, throttle a dependency) to prove the system degrades gracefully and the runbooks work. If your architecture can't survive a killed node in rehearsal, it won't survive one in production.

> **The senior framing:** "reliability is not 100% uptime — it's *bounded, measured* badness with a plan for the rest."`,
    diagram: {
      nodes: [
        { id: 'slis', label: 'SLIs', kind: 'other', x: 80, y: 200 },
        { id: 'slo', label: 'SLO 99.9%', kind: 'other', x: 280, y: 200 },
        { id: 'budget', label: 'Error budget', kind: 'other', x: 480, y: 200 },
        { id: 'rpo', label: 'RPO (data loss)', kind: 'db', x: 700, y: 100 },
        { id: 'rto', label: 'RTO (downtime)', kind: 'db', x: 700, y: 320 },
      ],
      edges: [
        { from: 'slis', to: 'slo' },
        { from: 'slo', to: 'budget' },
        { from: 'budget', to: 'rpo' },
        { from: 'budget', to: 'rto' },
      ],
    },
  },
]

