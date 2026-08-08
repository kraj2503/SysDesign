import type { SeedCaseStudy } from '../../types'

// Interactive "build the system" sessions. Each step is one stage of the simulator:
// requirements → estimation → assemble → deep dive → quiz.
export const caseStudies: SeedCaseStudy[] = [
  {
    slug: 'url-shortener',
    title: 'Design a URL Shortener (TinyURL)',
    summary: 'A read-heavy system: shorten long URLs into short codes and redirect billions of requests. Classic first design interview.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'shorten', text: 'Given a long URL, generate a short unique code that redirects to it', kind: 'functional' },
            { id: 'redirect', text: 'Given a short code, 301-redirect the browser to the original long URL', kind: 'functional' },
            { id: 'ttl', text: 'Support optional expiration for short links', kind: 'functional' },
            { id: 'custom', text: 'Let users pick a custom alias', kind: 'functional' },
            { id: 'latency', text: 'Redirect latency under 100 ms at the p99', kind: 'nonfunctional' },
            { id: 'scale', text: 'Handle 100M new URLs/day and ~100:1 read:write', kind: 'nonfunctional' },
            { id: 'avail', text: 'Highly available — redirects must not go down', kind: 'nonfunctional' },
            { id: 'video', text: 'Transcode uploaded videos to multiple resolutions', kind: 'functional' },
            { id: 'chat', text: 'Support real-time 1:1 messaging', kind: 'functional' },
          ],
          correct: ['shorten', 'redirect', 'latency', 'scale', 'avail'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'write-qps',
              label: 'Write (create) QPS',
              prompt: '100M new URLs per day. Average create QPS? (100M ÷ 86,400 s)',
              answer: 1160,
              unit: 'QPS',
            },
            {
              id: 'read-qps',
              label: 'Read (redirect) QPS',
              prompt: 'Assume 100:1 read:write ratio. Average redirect QPS?',
              answer: 116000,
              unit: 'QPS',
            },
            {
              id: 'storage',
              label: '10-year storage',
              prompt: '100M URLs/day × 365 × 10 years, ~100 bytes per row. Total storage in TB?',
              answer: 36.5,
              unit: 'TB',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'client', label: 'Browser / Client', kind: 'client' },
            { id: 'cdn', label: 'CDN', kind: 'cdn' },
            { id: 'lb', label: 'API Gateway', kind: 'lb' },
            { id: 'app', label: 'App Servers', kind: 'server' },
            { id: 'cache', label: 'Redirect Cache (Redis)', kind: 'cache' },
            { id: 'db', label: 'URL Store (SQL)', kind: 'db' },
            { id: 'trans', label: 'Video Transcoder', kind: 'other' },
          ],
          correctOrder: ['client', 'cdn', 'lb', 'app', 'cache', 'db'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'Best way to generate the short code?',
              options: [
                'Base64-encode the long URL',
                'Take a unique integer ID and encode it in base62',
                'Use the long URL\'s hash directly',
                'Use a random UUID and truncate it',
              ],
              correct: [1],
              explanation: 'Base62 over a unique ID gives compact, url-safe codes (no +/ like base64). Hashing the URL invites collisions; truncating UUIDs risks duplicates.',
              isTricky: true,
            },
            {
              prompt: '301 vs 302 redirect — which to choose and why?',
              options: [
                '301 always — browsers cache it, less load',
                '302 always — safest for SEO',
                '301 reduces repeat lookups but caches the mapping; use 302 if you need analytics/AB testing of the destination',
                'Neither — use JavaScript redirects only',
              ],
              correct: [2],
              explanation: '301 is cached by the browser/client, so repeat clicks skip your servers (less load) but also skip analytics. 302 re-hits your service each time — use it when you want to track clicks or vary the destination.',
              isTricky: true,
            },
            {
              prompt: 'The redirect path is read-heavy. How do you keep p99 latency low?',
              options: [
                'Add write replicas',
                'Cache hot short codes in an in-memory cache in front of the DB',
                'Use a message queue between app and DB',
                'Batch all redirects asynchronously',
              ],
              correct: [1],
              explanation: 'Most redirects hit a small set of popular codes; a cache (e.g. Redis) absorbs them. Replicas and queues do not help the read hot path.',
            },
            {
              prompt: 'A user wants a custom alias that is already taken. What do you do?',
              options: [
                'Silently overwrite the old one',
                'Return a conflict error and let them retry',
                'Always append a number',
                'Ban custom aliases',
              ],
              correct: [1],
              explanation: 'Custom aliases must be checked for collision and rejected — overwriting hijacks someone else\'s link. This is a small rate of writes, so the check is cheap.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'Why is the storage estimate ~36 TB for 10 years at 100M/day?',
              options: ['Because 100M × 365 × 10 × 100 bytes', 'Because URLs are unlimited', 'Because of base62 overhead', 'Because of the cache'],
              correct: [0],
              explanation: '365 billion rows × ~100 bytes ≈ 36.5 TB. This drives capacity planning and why you\'d shard eventually.',
            },
            {
              prompt: 'The redirect flow is optimized for…',
              options: ['Write latency', 'Read throughput and low read latency', 'Batch processing', 'Local storage'],
              correct: [1],
              explanation: 'Reads outnumber writes 100:1 — cache + fast lookup wins. Writes are few and can take the normal path.',
            },
            {
              prompt: 'What happens to the redirect cache on a cache miss?',
              options: ['The request fails', 'The app fetches from the DB, serves, and populates the cache', 'The cache replicates itself', 'The CDN serves it'],
              correct: [1],
              explanation: 'Cache-aside: miss → DB → serve → populate. The DB is the source of truth; the cache just accelerates the hot path.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'rate-limiter',
    title: 'Design a Rate Limiter',
    summary: 'Protect an API by limiting requests per user/IP. Small in size, deep in algorithm trade-offs.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'throttle', text: 'Reject requests that exceed a per-user (or per-IP) limit', kind: 'functional' },
            { id: 'algo', text: 'Support configurable limits per API/client tier', kind: 'functional' },
            { id: 'latency', text: 'Add minimal latency to allowed requests', kind: 'nonfunctional' },
            { id: 'scalable', text: 'Work across many API servers (shared, distributed state)', kind: 'nonfunctional' },
            { id: 'report', text: 'Return a clear error (429) with retry-after on throttling', kind: 'functional' },
            { id: 'analyze', text: 'Transcode videos to multiple resolutions', kind: 'functional' },
            { id: 'exact', text: 'Perfectly fair throttling with zero false positives', kind: 'nonfunctional' },
          ],
          correct: ['throttle', 'algo', 'latency', 'scalable', 'report'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'qps',
              label: 'Average API QPS',
              prompt: '10M daily active users, each ~120 requests/hour. Average QPS across the API?',
              answer: 13900,
              unit: 'QPS',
            },
            {
              id: 'mem',
              label: 'In-memory state',
              prompt: '~10M active clients × ~100 bytes of counter state (Redis). Rough memory needed in GB?',
              answer: 1,
              unit: 'GB',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'client', label: 'Clients', kind: 'client' },
            { id: 'lb', label: 'API Gateway (with limiter middleware)', kind: 'lb' },
            { id: 'cache', label: 'Redis (counters / token buckets)', kind: 'cache' },
            { id: 'app', label: 'App Servers', kind: 'server' },
            { id: 'db', label: 'Heavy OLTP database for every request', kind: 'db' },
          ],
          correctOrder: ['client', 'lb', 'cache', 'app'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: algorithms',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'Token bucket vs sliding window — which is fairer at boundaries?',
              options: [
                'Token bucket — it allows short bursts up to the bucket size',
                'Sliding window — it better limits the rate right at the window boundary',
                'They are identical',
                'Fixed window — it never allows bursts',
              ],
              correct: [1],
              explanation: 'Fixed window allows 2× bursts at boundaries; token bucket smooths over time but allows a burst. Sliding-window-log is the most precise; sliding-window-counter is a cheap approximation.',
              isTricky: true,
            },
            {
              prompt: 'Why store limiter state in Redis instead of in each app server\'s memory?',
              options: [
                'Because app servers are stateless and any request can hit any server, so limits must be shared',
                'Redis is faster than memory',
                'Because token buckets need a database',
                'There is no reason',
              ],
              correct: [0],
              explanation: 'With stateless servers behind a load balancer, local counters would let a user exceed the limit by spreading requests across servers. A shared store makes the limit global.',
              isTricky: true,
            },
            {
              prompt: 'Redis has a cache eviction policy that can evict rate-limit counters. Is that a problem?',
              options: [
                'No — evicted counters just reset, so the user briefly gets a fresh allowance',
                'Yes — eviction permanently breaks rate limiting',
                'Redis never evicts',
                'Only if the policy is LFU',
              ],
              correct: [0],
              explanation: 'If a counter is evicted, the next request re-creates it from zero — a minor loophole (an evicted client gets a fresh bucket). Acceptable for most systems; that is why you size Redis appropriately.',
              isTricky: true,
            },
            {
              prompt: 'When a request is throttled, the response should include…',
              options: [
                'Just a 200 OK',
                '429 status with a Retry-After header and X-RateLimit-* headers',
                '500 Internal Server Error',
                'A redirect',
              ],
              correct: [1],
              explanation: '429 signals the client to back off; Retry-After says when; rate-limit headers tell the client how much quota remains. A 500 would trigger client retries and amplify the load.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'Why is a shared (distributed) limiter needed at scale?',
              options: ['To reduce Redis cost', 'Because servers are stateless and requests hit any server', 'To simplify the DB', 'Because tokens need a queue'],
              correct: [1],
              explanation: 'Stateless app servers + load balancing means local counters are unreliable — limits must live in a shared store.',
            },
            {
              prompt: 'Which header tells a client when it may retry?',
              options: ['Retry-After', 'X-Cache', 'Content-Type', 'ETag'],
              correct: [0],
              explanation: 'Retry-After (seconds or HTTP date) tells the client when the window resets.',
            },
            {
              prompt: 'The main trade-off of the fixed-window algorithm is…',
              options: ['It is too slow', 'It allows up to 2× the limit around window boundaries', 'It needs a database', 'It cannot be implemented'],
              correct: [1],
              explanation: 'At the boundary between windows, a client can use its full quota in the last instant of one window and again at the start of the next — up to 2× the limit.',
              isTricky: true,
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'unique-id-generator',
    title: 'Design a Unique ID Generator (Snowflake)',
    summary: 'Generate billions of unique, sortable, 64-bit IDs across many services without a single point of failure.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'unique', text: 'IDs must be globally unique', kind: 'functional' },
            { id: 'sortable', text: 'IDs should be roughly sortable by creation time (numeric)', kind: 'functional' },
            { id: 'short', text: 'Fit in 64 bits (usable in URLs, DB primary keys)', kind: 'nonfunctional' },
            { id: 'high', text: 'Support ~10k IDs/second peak, scale horizontally', kind: 'nonfunctional' },
            { id: 'no-spof', text: 'No single point of failure (no one central counter)', kind: 'nonfunctional' },
            { id: 'decrypt', text: 'IDs must be reversible to reveal the original long URL', kind: 'functional' },
            { id: 'zero', text: 'Must not require a database at all, ever', kind: 'nonfunctional' },
          ],
          correct: ['unique', 'sortable', 'short', 'high', 'no-spof'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'peak',
              label: 'Peak ID generation rate',
              prompt: '100M IDs/day average. If peak is ~8× average, peak IDs/second?',
              answer: 9300,
              unit: 'IDs/s',
            },
            {
              id: 'bits',
              label: 'Bits needed',
              prompt: '1 billion IDs/second for 100 years ≈ 3.15×10¹⁸ IDs. Minimum bits to represent that? (2^62 ≈ 4.6×10¹⁸)',
              answer: 62,
              unit: 'bits',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'client', label: 'Clients (services)', kind: 'client' },
            { id: 'lb', label: 'API / LB', kind: 'lb' },
            { id: 'app', label: 'ID Generator Service (Snowflake)', kind: 'server' },
            { id: 'db', label: 'Sequence DB (allocates ID ranges)', kind: 'db' },
            { id: 'queue', label: 'Kafka topic for every ID', kind: 'queue' },
          ],
          correctOrder: ['client', 'lb', 'app', 'db'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: Snowflake anatomy',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'A classic Snowflake 64-bit ID is roughly made of…',
              options: [
                'Timestamp (41 bits) + machine ID (10 bits) + sequence (12 bits)',
                'Random 64 bits',
                'URL hash',
                'UUID v4',
              ],
              correct: [0],
              explanation: 'Snowflake splits 64 bits: ~41-bit millisecond timestamp (gives ~69 years), ~10-bit machine/worker id, ~12-bit sequence. That makes IDs time-sortable and unique per machine.',
              isTricky: true,
            },
            {
              prompt: 'Why is a UUID v4 (random 128-bit) NOT ideal here?',
              options: [
                'It is too short',
                'It is 128-bit (too long for the requirement) and not time-sortable, hurting index locality',
                'It is not unique',
                'It is always duplicated',
              ],
              correct: [1],
              explanation: 'UUID v4 is random — no ordering, worse index locality (random inserts), and 128 bits doesn\'t fit the 64-bit constraint. Snowflake gives compact, sortable IDs.',
              isTricky: true,
            },
            {
              prompt: 'What breaks if two machines use the same worker ID?',
              options: [
                'Nothing',
                'They can generate duplicate IDs within the same millisecond',
                'The timestamp overflows',
                'IDs become longer',
              ],
              correct: [1],
              explanation: 'The sequence alone distinguishes IDs in the same millisecond. Two nodes with the same worker id can collide when their timestamps and sequences align. Worker IDs must be unique and coordinated.',
            },
            {
              prompt: 'When the sequence rolls over within one millisecond, you should…',
              options: [
                'Generate a random fallback ID',
                'Wait for the next millisecond',
                'Increase the timestamp bits',
                'Return a duplicate',
              ],
              correct: [1],
              explanation: 'If the 12-bit sequence (4096 values) is exhausted in one ms, you wait for the next ms — the standard Snowflake behavior. You never recycle or duplicate.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'The timestamp-first layout makes Snowflake IDs…',
              options: ['Random', 'Roughly time-ordered, good for DB index locality', 'Shorter', 'Encrypted'],
              correct: [1],
              explanation: 'Sortable by time → sequential-ish inserts → better B-tree index locality than random UUIDs.',
            },
            {
              prompt: 'What limits the max IDs per millisecond per machine?',
              options: ['The machine clock', 'The sequence bits (12 → 4096/ms)', 'Network bandwidth', 'The database'],
              correct: [1],
              explanation: '12 sequence bits = 4096 IDs per millisecond per worker before it must wait for the next ms.',
              isTricky: true,
            },
            {
              prompt: 'A key advantage of Snowflake over a central auto-increment counter is…',
              options: ['Smaller IDs', 'No single point of failure — each machine generates locally', 'It is faster than memory', 'It needs no clock'],
              correct: [1],
              explanation: 'Distributed generation removes the bottleneck/SPOF of one counter while staying collision-free via worker IDs.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'key-value-store',
    title: 'Design a Key-Value Store (Dynamo-style)',
    summary: 'A distributed KV store with tunable consistency: consistent hashing, replication, quorum reads/writes, and failure handling.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'put', text: 'put(key, value) and get(key) with a simple API', kind: 'functional' },
            { id: 'cap', text: 'Scale to tens of TB and high write throughput', kind: 'nonfunctional' },
            { id: 'avail', text: 'Available even when some nodes fail (tunable consistency)', kind: 'nonfunctional' },
            { id: 'repl', text: 'Replicate data for durability (N replicas)', kind: 'nonfunctional' },
            { id: 'eventual', text: 'Support eventual consistency as the default', kind: 'functional' },
            { id: 'sql', text: 'Support complex joins across keys', kind: 'functional' },
            { id: 'ordered', text: 'Require global secondary indexes with transactions', kind: 'nonfunctional' },
          ],
          correct: ['put', 'cap', 'avail', 'repl', 'eventual'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'write-qps',
              label: 'Write QPS',
              prompt: '100M writes/day average. Average write QPS?',
              answer: 1160,
              unit: 'QPS',
            },
            {
              id: 'bandwidth',
              label: 'Write bandwidth',
              prompt: 'Write QPS × 1 KB values → bandwidth in MB/s?',
              answer: 1.2,
              unit: 'MB/s',
            },
            {
              id: 'per-node',
              label: 'Per-node storage',
              prompt: '10 TB data, 3× replication, across 10 nodes. Storage per node in TB?',
              answer: 3,
              unit: 'TB',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'client', label: 'Clients', kind: 'client' },
            { id: 'lb', label: 'Coordinator / Routing (consistent hashing ring)', kind: 'lb' },
            { id: 'server', label: 'Storage Nodes (replicated, N=3)', kind: 'server' },
            { id: 'cache', label: 'In-memory layer / local index', kind: 'cache' },
            { id: 'cdn', label: 'Global CDN for all keys', kind: 'cdn' },
            { id: 'queue', label: 'Kafka for every read', kind: 'queue' },
          ],
          correctOrder: ['client', 'lb', 'server', 'cache'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: consistency & replication',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'Why does consistent hashing make sense for a KV store\'s partition scheme?',
              options: [
                'It keeps keys perfectly ordered',
                'Adding/removing nodes moves only the keys on the affected ring segment — minimal rebalancing',
                'It avoids replication',
                'It makes range queries free',
              ],
              correct: [1],
              explanation: 'Consistent hashing spreads keys across a ring and only the arc belonging to a changed node is affected, so scaling barely moves data. Range queries are still hard.',
              isTricky: true,
            },
            {
              prompt: 'A KV store uses N=3, W=2, R=2. What does W+R>N give you?',
              options: [
                'Strong consistency always',
                'A read quorum that overlaps a write quorum, so one node can fail and reads still see recent writes',
                'Zero failures tolerated',
                'Linearizability for every operation',
              ],
              correct: [1],
              explanation: 'W+R>N guarantees overlap: any read quorum intersects any write quorum. That yields a strong-ish guarantee (with read repair, etc.) and tolerates a minority failure.',
              isTricky: true,
            },
            {
              prompt: 'If W=1 and R=1, what is the main risk?',
              options: [
                'Higher latency',
                'A read can hit a node that never got the write (stale read)',
                'Data corruption',
                'Nothing — this is ideal',
              ],
              correct: [1],
              explanation: 'W=1/R=1 means reads and writes touch disjoint nodes easily — reads may miss recent writes entirely. That is max availability, weak consistency.',
            },
            {
              prompt: 'Dynamo handles a conflict between two concurrent writes via…',
              options: [
                'Last-writer-wins or vector clocks / sibling resolution',
                'The database rejects both',
                'A central lock',
                'The client\'s IP',
              ],
              correct: [0],
              explanation: 'Leaderless systems reconcile concurrent updates with vector clocks (siblings) or LWW. There is no single source of truth, so the application must sometimes resolve.',
              isTricky: true,
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'In this design, why replicate each key to N nodes?',
              options: ['To balance reads', 'Durability and availability when nodes fail', 'To reduce latency', 'To enable SQL'],
              correct: [1],
              explanation: 'Replication (N copies) means losing a node doesn\'t lose data or availability — reads/writes continue via the remaining replicas.',
            },
            {
              prompt: 'Lowering W (write quorum) makes writes…',
              options: ['Slower and more consistent', 'Faster but potentially inconsistent', 'Impossible', 'Encrypted'],
              correct: [1],
              explanation: 'W=1 needs only one node to ack — fast but weak; W=3 waits for three — slower but safer. Tunable consistency.',
            },
            {
              prompt: 'A "hot key" in the KV store…',
              options: ['Is fine because of hashing', 'Can overload the one node responsible for it', 'Is fixed by replication', 'Only affects reads'],
              correct: [1],
              explanation: 'A single extremely popular key lands on one node/partition and saturates it — a hotspot. Hashing spreads by key but a dominant key is still one point of load.',
              isTricky: true,
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'web-crawler',
    title: 'Design a Web Crawler',
    summary: 'Crawl billions of pages: a URL frontier, polite per-domain fetching, content dedupe, and a pipeline that feeds a search index.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'crawl', text: 'Crawl the web: fetch pages starting from seed URLs and follow links', kind: 'functional' },
            { id: 'extract', text: 'Extract text, links, and metadata from downloaded pages for indexing', kind: 'functional' },
            { id: 'store', text: 'Store raw page content so search results can later be served', kind: 'functional' },
            { id: 'dedupe', text: 'Avoid crawling the same content twice (dedupe near-identical pages)', kind: 'nonfunctional' },
            { id: 'polite', text: 'Be polite: respect robots.txt and rate-limit requests per domain', kind: 'nonfunctional' },
            { id: 'fresh', text: 'Re-crawl pages periodically so content stays fresh', kind: 'nonfunctional' },
            { id: 'scale', text: 'Handle ~1B links with billions of page fetches per month', kind: 'nonfunctional' },
            { id: 'video', text: 'Transcode uploaded videos to multiple resolutions', kind: 'functional' },
          ],
          correct: ['crawl', 'extract', 'store', 'dedupe', 'polite', 'fresh', 'scale'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'fetches',
              label: 'Page fetches per month',
              prompt: '1B links to crawl, average refresh once per week. How many page fetches per month?',
              answer: 4000000000,
              unit: 'pages/month',
            },
            {
              id: 'storage-month',
              label: 'Raw storage added per month',
              prompt: 'Average page is 500 KB and we fetch 4B pages a month. Storage added monthly?',
              answer: 2,
              unit: 'PB',
            },
            {
              id: 'write-qps',
              label: 'Average write QPS',
              prompt: '4B fetches spread over ~2.5M seconds in a month. Average write QPS?',
              answer: 1600,
              unit: 'QPS',
            },
            {
              id: 'storage-3yr',
              label: 'Storage after 3 years',
              prompt: '2 PB added per month, unchanged for 3 years. Total raw content stored?',
              answer: 72,
              unit: 'PB',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the architecture',
        type: 'assemble',
        content: {
          components: [
            { id: 'frontier', label: 'URL frontier (queue)', kind: 'queue' },
            { id: 'fetcher', label: 'HTML fetcher', kind: 'server' },
            { id: 'parser', label: 'Content parser', kind: 'server' },
            { id: 'dedupe', label: 'Content-seen store', kind: 'cache' },
            { id: 'blob', label: 'Raw content store', kind: 'db' },
            { id: 'extractor', label: 'Link extractor', kind: 'other' },
            { id: 'cdn', label: 'CDN', kind: 'cdn' },
          ],
          correctOrder: ['frontier', 'fetcher', 'parser', 'dedupe', 'blob', 'extractor'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive & trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'To be "polite" to a website, the crawler must…',
              options: [
                'Crawl all pages of a site as fast as the network allows',
                'Rate-limit requests per domain and honor robots.txt and crawl delays',
                'Only crawl sites that advertise themselves',
                'Use many IP addresses to bypass rate limits',
              ],
              correct: [1],
              explanation: 'Politeness means never hammering one domain: throttle QPS per domain, honor robots.txt, and respect the crawl-delay. Bypassing limits is the opposite of polite and gets you banned.',
            },
            {
              prompt: 'A crawler can get stuck in an infinite loop when…',
              options: [
                'The page size exceeds 1 MB',
                'The link graph contains cycles (A links to B, B links back to A)',
                'The HTML is malformed',
                'The DNS server is slow',
              ],
              correct: [1],
              explanation: 'Cycles in the link graph re-enqueue the same pages forever. The content-seen store (signatures) breaks cycles by skipping pages we already crawled.',
            },
            {
              prompt: 'The URL frontier is best modeled as…',
              options: [
                'A plain FIFO queue',
                'A priority queue (e.g. Redis sorted set) ranked by importance and freshness',
                'A single table in a relational DB',
                'An in-memory array inside the fetcher',
              ],
              correct: [1],
              explanation: 'Not all URLs are equal: popular, high-authority pages should be crawled first and re-crawled more often. A priority queue encodes that.',
            },
            {
              prompt: 'Why store a "signature" (fingerprint) of each page?',
              options: [
                'To compress the raw content',
                'To detect duplicate and near-duplicate pages and avoid re-crawling them',
                'To encrypt the page before storage',
                'To rank search results',
              ],
              correct: [1],
              explanation: 'Mirrored sites and shared boilerplate produce identical or near-identical pages at different URLs. Signatures (e.g. simhash) let the crawler skip them, saving bandwidth, storage, and crawl budget.',
              isTricky: true,
            },
            {
              prompt: 'The main trade-off imposed by politeness limits is…',
              options: [
                'Higher storage cost',
                'Crawl throughput is capped per domain, slowing overall freshness',
                'Lower search relevance',
                'More CPU usage',
              ],
              correct: [1],
              explanation: 'Politeness deliberately throttles how fast a single domain is crawled. The cost is that fresh updates on popular sites are found more slowly.',
              isTricky: true,
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'Why do crawlers prefer breadth-first over depth-first?',
              options: [
                'It uses less memory',
                'It visits important pages closer to the seed (root) sooner',
                'It avoids robots.txt',
                'It crawls more pages per second',
              ],
              correct: [1],
              explanation: 'BFS explores near the root/popular pages first, so high-value content is indexed before diving deep into a single site.',
            },
            {
              prompt: 'Two different URLs serve identical content. The crawler…',
              options: [
                'Just wastes bandwidth and storage unless dedupe catches it',
                'Crashes',
                'Corrupts the index',
                'Gets banned',
              ],
              correct: [0],
              explanation: 'Duplicates are not fatal, but they waste bandwidth, storage, and crawl budget. Content-signature dedupe prevents the waste.',
            },
            {
              prompt: 'A page starts returning 404 after being crawled before. The crawler should…',
              options: [
                'Keep re-crawling it forever',
                'Lower its priority and eventually drop it from the index',
                'Crawl it every second to confirm',
                'Return an error to the end user',
              ],
              correct: [1],
              explanation: 'A 404 means the page is gone. The crawler deprioritizes it, removes it from the index, and stops spending crawl budget on it.',
            },
            {
              prompt: 'Freshness matters most for…',
              options: [
                'Obscure pages nobody visits',
                'Popular pages that change often (news, social feeds)',
                'Binary file downloads',
                '404 pages',
              ],
              correct: [1],
              explanation: 'High-traffic, frequently-changing pages should be re-crawled often; static obscure pages rarely. The frontier priority encodes this.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'notification-system',
    title: 'Design a Notification System',
    summary: 'Deliver push, SMS, and email to millions of devices: a notification service, message queue, workers, and third-party providers with rate limiting and retries.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'push', text: 'Deliver push notifications to mobile devices via APNs/FCM', kind: 'functional' },
            { id: 'email', text: 'Send transactional and marketing email at scale', kind: 'functional' },
            { id: 'sms', text: 'Send SMS through a third-party provider', kind: 'functional' },
            { id: 'track', text: 'Track delivery status and retry on failure', kind: 'functional' },
            { id: 'prefs', text: 'Respect user preferences and opt-outs (do-not-disturb)', kind: 'nonfunctional' },
            { id: 'rate', text: 'Rate-limit outgoing notifications to avoid provider throttling', kind: 'nonfunctional' },
            { id: 'scale', text: 'Handle millions of notifications per day with low latency', kind: 'nonfunctional' },
            { id: 'video', text: 'Transcode uploaded videos to multiple resolutions', kind: 'functional' },
          ],
          correct: ['push', 'email', 'sms', 'track', 'prefs', 'rate', 'scale'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'daily',
              label: 'Notifications per day',
              prompt: 'Assume 10M pushes + 5M emails + 5M SMS per day. Total per day?',
              answer: 20000000,
              unit: 'notifications/day',
            },
            {
              id: 'avg-qps',
              label: 'Average throughput',
              prompt: '20M notifications spread over 86,400 seconds. Average QPS?',
              answer: 232,
              unit: 'QPS',
            },
            {
              id: 'tokens',
              label: 'Device tokens to store',
              prompt: '100M registered devices, ~3 tokens each (phone, tablet, laptop). Tokens to store?',
              answer: 300000000,
              unit: 'tokens',
            },
            {
              id: 'peak-qps',
              label: 'Peak throughput',
              prompt: 'A flash event pushes ~10× the average rate. Peak notification QPS?',
              answer: 2300,
              unit: 'QPS',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the architecture',
        type: 'assemble',
        content: {
          components: [
            { id: 'app', label: 'Mobile / web client', kind: 'client' },
            { id: 'notif-service', label: 'Notification service', kind: 'server' },
            { id: 'queue', label: 'Message queue', kind: 'queue' },
            { id: 'worker', label: 'Notification workers', kind: 'server' },
            { id: 'device-store', label: 'Device token + settings store', kind: 'db' },
            { id: 'provider', label: 'APNs / FCM / SMS / email providers', kind: 'other' },
            { id: 'cdn', label: 'CDN', kind: 'cdn' },
          ],
          correctOrder: ['app', 'notif-service', 'queue', 'worker', 'device-store', 'provider'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive & trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'Why place a message queue between the notification service and the workers?',
              options: [
                'To make the database faster',
                'To buffer traffic spikes, decouple sender from provider latency, and enable retries',
                'To encrypt the payload',
                'There is no reason — it only adds latency',
              ],
              correct: [1],
              explanation: 'The queue absorbs bursts (e.g. a campaign), decouples the service from slow third-party providers, and lets failed sends be retried by workers without blocking the sender.',
            },
            {
              prompt: 'A third-party provider (APNs/FCM) starts rejecting your requests. Best response?',
              options: [
                'Send faster to get through',
                'Rate-limit, use a circuit breaker, and fail over to an alternate provider',
                'Ignore the errors',
                'Switch to polling',
              ],
              correct: [1],
              explanation: 'Providers throttle and even ban abusive clients. You rate-limit outbound traffic, trip a circuit breaker when error rates spike, and fail over to a backup provider.',
              isTricky: true,
            },
            {
              prompt: 'A push fails with a transient error. Retrying naively (resending) risks…',
              options: [
                'Nothing',
                'Duplicate notifications if the first send actually succeeded',
                'Data loss',
                'Slower workers',
              ],
              correct: [1],
              explanation: 'The send may have succeeded server-side before the response was lost. Retries must be idempotent — dedupe by a unique request ID so users never get the same notification twice.',
              isTricky: true,
            },
            {
              prompt: 'A device token becomes invalid (user uninstalled the app). You should…',
              options: [
                'Keep retrying forever',
                'Remove the token from the device store and stop sending to it',
                'Email them instead',
                'Ignore it and resend tomorrow',
              ],
              correct: [1],
              explanation: 'Invalid tokens are flagged by providers (e.g. APNs error 410). Prune them from the device store so the workers do not keep paying for dead sends.',
            },
            {
              prompt: 'Users who opt out of a notification type should be filtered…',
              options: [
                'After the provider sends',
                'Before the notification enters the queue (by a preferences check)',
                'Never',
                'Only for SMS',
              ],
              correct: [1],
              explanation: 'Filtering early (a preferences service) avoids wasting queue, worker, and provider resources on sends the user will not receive.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'The biggest external bottleneck in a notification system is usually…',
              options: [
                'The SQL database',
                'Third-party providers (APNs, FCM, SMS gateways)',
                'The web client',
                'The load balancer',
              ],
              correct: [1],
              explanation: 'APNs/FCM/SMS are external services with their own rate limits and quotas. Everything else is easier to scale internally.',
            },
            {
              prompt: 'Why store device tokens in a dedicated store instead of the user DB?',
              options: [
                'Tokens are not related to users',
                'A user has many devices/tokens, and the lookup is separate from profile reads',
                'It is cheaper',
                'Tokens are public',
              ],
              correct: [1],
              explanation: 'One user maps to many tokens (phone, tablet, laptop, watch). Keeping them separate lets workers batch token lookups without loading user profiles.',
            },
            {
              prompt: 'For reliable delivery you track a per-notification status lifecycle. It should be…',
              options: [
                'sent → deleted',
                'sent → delivered → opened (per provider + device feedback)',
                'queued → queued',
                'created → archived immediately',
              ],
              correct: [1],
              explanation: 'A message ID plus status (created, sent, delivered, opened) powers analytics and lets you retry only what is stuck.',
            },
            {
              prompt: 'The recommended retry behavior for a failed provider send is…',
              options: [
                'Immediate resend up to 100 times',
                'Exponential backoff with a maximum attempt count',
                'No retry at all',
                'Resend only on a schedule next day',
              ],
              correct: [1],
              explanation: 'Exponential backoff avoids hammering a provider that is already struggling; a max attempt count stops endless resending of truly dead notifications.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'news-feed',
    title: 'Design a News Feed',
    summary: 'Aggregate posts from people you follow into one timeline: fan-out on publish vs on read, timeline caching, and ranking at millions of users.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'post', text: 'Publish new posts (text + media) from any user', kind: 'functional' },
            { id: 'homefeed', text: 'Show a home timeline aggregating posts from people the user follows', kind: 'functional' },
            { id: 'follow', text: 'Support follow / unfollow between users', kind: 'functional' },
            { id: 'rank', text: 'Rank posts by relevance and recency', kind: 'functional' },
            { id: 'latency', text: 'Timeline loads in well under 200 ms at the p99', kind: 'nonfunctional' },
            { id: 'scale', text: 'Serve millions of daily active users', kind: 'nonfunctional' },
            { id: 'avail', text: 'Highly available — the feed must not go down', kind: 'nonfunctional' },
            { id: 'video', text: 'Transcode uploaded videos to multiple resolutions', kind: 'functional' },
          ],
          correct: ['post', 'homefeed', 'follow', 'rank', 'latency', 'scale', 'avail'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'write-qps',
              label: 'Post (write) QPS',
              prompt: '100M posts per day spread over 86,400 seconds. Average write QPS?',
              answer: 1150,
              unit: 'QPS',
            },
            {
              id: 'read-qps',
              label: 'Timeline read QPS',
              prompt: '10M DAU loading the feed ~5 times a day. Average read QPS?',
              answer: 580,
              unit: 'QPS',
            },
            {
              id: 'fanout',
              label: 'Fan-out copies per day',
              prompt: 'Push fan-out: 100M posts/day, average user has 200 followers. Copies written to timelines per day?',
              answer: 20000000000,
              unit: 'writes/day',
            },
            {
              id: 'media',
              label: 'Media storage per day',
              prompt: '100M posts averaging 500 KB including media. Storage added per day?',
              answer: 50,
              unit: 'TB',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the architecture',
        type: 'assemble',
        content: {
          components: [
            { id: 'app', label: 'Client app', kind: 'client' },
            { id: 'lb', label: 'Load balancer', kind: 'lb' },
            { id: 'feed-service', label: 'News feed service', kind: 'server' },
            { id: 'feed-cache', label: 'Timeline cache', kind: 'cache' },
            { id: 'post-store', label: 'Posts / social-graph store', kind: 'db' },
            { id: 'fanout-queue', label: 'Fan-out queue', kind: 'queue' },
            { id: 'fanout-worker', label: 'Fan-out workers', kind: 'server' },
            { id: 'cdn', label: 'CDN', kind: 'cdn' },
          ],
          correctOrder: ['app', 'lb', 'feed-service', 'feed-cache', 'post-store', 'fanout-queue', 'fanout-worker'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive & trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'In push (fan-out on write) the timeline is pre-computed when…',
              options: [
                'The user opens the app',
                'A post is created, by copying it to every follower timeline',
                'The user follows someone new',
                'A post is deleted',
              ],
              correct: [1],
              explanation: 'Push fan-out copies each new post into every follower timeline immediately. Reads are then just a cache fetch — very fast, but the write path does a lot of work.',
            },
            {
              prompt: 'The main drawback of pure push fan-out is…',
              options: [
                'Slow timeline reads',
                'The "celebrity problem": a post by a user with millions of followers floods the system',
                'No storage for posts',
                'No ordering',
              ],
              correct: [1],
              explanation: 'Celebrities have huge follower counts, so one post fans out to millions of timelines — a write storm. Pure pull avoids this but reads become slow.',
              isTricky: true,
            },
            {
              prompt: 'The standard fix for the celebrity problem is…',
              options: [
                'Block celebrities',
                'Hybrid: push fan-out for normal users, pull (compute on read) for celebrities',
                'Store all posts in RAM',
                'Use a single database',
              ],
              correct: [1],
              explanation: 'Hybrid fan-out pushes to followers of ordinary users, but for accounts with very many followers the feed is assembled on read. Balances write cost and read latency.',
            },
            {
              prompt: 'The timeline cache should store…',
              options: [
                'Full post content for every follower',
                'Compact post IDs, enriched with content on read',
                'Only the follower count',
                'Nothing — always hit the DB',
              ],
              correct: [1],
              explanation: 'Caching post IDs (not content) keeps entries small, makes ranking/invalidation easy, and defers content joins until read. Content changes do not force a timeline rebuild.',
              isTricky: true,
            },
            {
              prompt: 'A user follows 10,000 people. With push fan-out, their timeline gets…',
              options: [
                'Fewer updates than average',
                'Updates from all 10,000 accounts, which is a lot of writes',
                'No updates',
                'Updates only from celebrities',
              ],
              correct: [1],
              explanation: 'High-follower-count users (or power users who follow thousands) receive a huge write volume. Extreme cases are why some systems cap fan-out or switch those users to pull.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'The main advantage of push fan-out is…',
              options: [
                'Lower write load',
                'Fast timeline reads (pre-computed)',
                'Simpler storage',
                'Guaranteed consistency',
              ],
              correct: [1],
              explanation: 'Timelines are ready before the user asks, so reads are cheap and fast. The cost is moved to the write path.',
            },
            {
              prompt: 'Pull fan-out (compute on read) is better when…',
              options: [
                'There are many celebrity accounts',
                'Users read infrequently',
                'Timelines are huge',
                'All of the above',
              ],
              correct: [3],
              explanation: 'Pull avoids fan-out storms for celebs, wastes nothing on users who rarely read, and is simpler — at the cost of slower, more expensive reads.',
            },
            {
              prompt: 'How do we keep the timeline sorted by time at scale?',
              options: [
                'Sort on every read from the DB',
                'Keep a monotonic post ID and store IDs in the cache in that order',
                'Random order',
                'Sort by follower count',
              ],
              correct: [1],
              explanation: 'Appending monotonic IDs to the cached list preserves chronological order cheaply, with no per-read sort over the whole graph.',
            },
            {
              prompt: 'A follower may not immediately see a celebrity post under hybrid fan-out. Why is that acceptable?',
              options: [
                'It is not acceptable',
                'Feeds are eventually consistent — a slight delay is fine for this use case',
                'Posts are deleted',
                'Celebrities never post',
              ],
              correct: [1],
              explanation: 'Pull-on-read for celebrities means a follower sees the post on their next read. Eventual consistency is fine for a social feed; users tolerate a small delay.',
              isTricky: true,
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'chat-messenger',
    title: 'Design a Chat Messenger',
    summary: 'Real-time messaging at millions of concurrent connections: WebSocket gateways, per-conversation ordering, presence, and offline sync.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'send', text: 'Send and receive 1:1 messages in real time', kind: 'functional' },
            { id: 'group', text: 'Support group chats', kind: 'functional' },
            { id: 'presence', text: 'Show online / offline presence', kind: 'functional' },
            { id: 'receipts', text: 'Delivered / read receipts', kind: 'functional' },
            { id: 'history', text: 'Load message history and sync across devices', kind: 'functional' },
            { id: 'ordering', text: 'Order messages correctly within each conversation', kind: 'nonfunctional' },
            { id: 'scale', text: 'Handle millions of concurrent connections', kind: 'nonfunctional' },
            { id: 'video', text: 'Transcode uploaded videos to multiple resolutions', kind: 'functional' },
          ],
          correct: ['send', 'group', 'presence', 'receipts', 'history', 'ordering', 'scale'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'conn',
              label: 'Concurrent connections',
              prompt: '100M total users, ~half online at peak. Concurrent WebSocket connections?',
              answer: 50000000,
              unit: 'connections',
            },
            {
              id: 'msgs',
              label: 'Messages per second',
              prompt: '10B messages per day spread over 86,400 seconds. Average message rate?',
              answer: 115000,
              unit: 'msg/s',
            },
            {
              id: 'storage',
              label: 'Text storage per day',
              prompt: '10B messages × ~100 bytes of text each. Storage added per day?',
              answer: 1000,
              unit: 'GB',
            },
            {
              id: 'peak',
              label: 'Peak message rate',
              prompt: 'A big event drives ~5× the average. Peak message rate?',
              answer: 575000,
              unit: 'msg/s',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the architecture',
        type: 'assemble',
        content: {
          components: [
            { id: 'app', label: 'Chat client', kind: 'client' },
            { id: 'lb', label: 'Load balancer', kind: 'lb' },
            { id: 'chat-service', label: 'Chat / WebSocket service', kind: 'server' },
            { id: 'msg-queue', label: 'Message queue', kind: 'queue' },
            { id: 'msg-store', label: 'Message store', kind: 'db' },
            { id: 'presence', label: 'Presence service', kind: 'server' },
            { id: 'push-notif', label: 'Push notification', kind: 'other' },
            { id: 'cdn', label: 'CDN', kind: 'cdn' },
          ],
          correctOrder: ['app', 'lb', 'chat-service', 'msg-queue', 'msg-store', 'presence', 'push-notif'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive & trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'Why use WebSockets instead of plain HTTP for chat?',
              options: [
                'HTTP cannot send data at all',
                'A persistent bidirectional connection delivers messages with low latency and no polling overhead',
                'WebSockets are cheaper to operate',
                'HTTP is slower on the wire for every payload',
              ],
              correct: [1],
              explanation: 'WebSocket keeps one long-lived full-duplex connection so the server can push messages the instant they arrive. Polling and long-polling are slower or waste requests.',
            },
            {
              prompt: 'Two messages are sent in the same millisecond. To order them correctly you need…',
              options: [
                'The client clock timestamp',
                'A server-assigned monotonic sequence/message ID per conversation',
                'Random UUIDs',
                'Alphabetical sorting',
              ],
              correct: [1],
              explanation: 'Client clocks drift, so ordering must come from a server-assigned per-conversation sequence. The client shows messages in sequence order, not send order.',
              isTricky: true,
            },
            {
              prompt: 'How does a multi-device client sync only what it has missed?',
              options: [
                'It re-downloads the entire conversation',
                'It stores the last synced message ID per conversation and pulls everything after it',
                'It can never sync',
                'It uses the server clock',
              ],
              correct: [1],
              explanation: 'Tracking a last-seen message ID per (user, conversation, device) lets the client fetch only the delta after reconnect — efficient and simple to resume.',
            },
            {
              prompt: 'A user goes offline without closing the app. Presence shows them online forever unless you…',
              options: [
                'Never show presence',
                'Use heartbeats and mark offline after a timeout with no heartbeat',
                'Restart the server',
                'Ask them to log out',
              ],
              correct: [1],
              explanation: 'Silent disconnects are invisible. Heartbeat pings with a timeout (e.g. no ping for 30 s → offline) make presence eventually correct.',
            },
            {
              prompt: 'A message sent to an offline user must be…',
              options: [
                'Dropped',
                'Stored server-side, delivered via push notification, then synced when they reconnect',
                'Delivered by email',
                'Queued only in memory',
              ],
              correct: [1],
              explanation: 'Chat stores messages so offline users get them on reconnect (WhatsApp-style). Push notification signals a new message; history sync delivers the content.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'What does a chat WebSocket connection carry beyond message payloads?',
              options: [
                'Only the payload',
                'Keepalive/heartbeat frames, presence signals, and delivery acknowledgements',
                'DNS queries',
                'Database rows',
              ],
              correct: [1],
              explanation: 'The connection multiplexes payloads with control frames (ping/pong), presence updates, and acks — all over one socket.',
            },
            {
              prompt: 'Presence that is always up-to-date for millions of users relies on…',
              options: [
                'A single presence table updated on every action',
                'A heartbeat model plus a presence service that fans out status to friends',
                'The database polling every second',
                'Users manually updating status',
              ],
              correct: [1],
              explanation: 'Heartbeats drive online/offline, and a presence service propagates changes to the friends who are looking. Polling a central table does not scale.',
            },
            {
              prompt: 'The biggest scaling challenge for a messenger is…',
              options: [
                'Storing the text of messages',
                'Managing millions of long-lived concurrent connections and routing messages to them',
                'Designing the login page',
                'Choosing a font',
              ],
              correct: [1],
              explanation: 'Concurrent connection count dominates: each socket holds memory, state, and a routing table entry. Message storage is comparatively cheap.',
              isTricky: true,
            },
            {
              prompt: 'Read receipts require…',
              options: [
                'No state at all',
                'Tracking per-message delivery and read status in the message store',
                'A video player',
                'The recipient phone number',
              ],
              correct: [1],
              explanation: 'Receipts need per-message status (sent → delivered → read), updated as the recipient acknowledges, so the sender can display ticks.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'search-autocomplete',
    title: 'Design Search Autocomplete (Typeahead)',
    summary: 'Predict what the user is about to type. A trie of popular phrases with precomputed top-K suggestions, cached and served in under 100 ms.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'suggest', text: 'Return up to 5 ranked suggestions as the user types each character', kind: 'functional' },
            { id: 'rank', text: 'Rank suggestions by popularity (how often the phrase is searched)', kind: 'functional' },
            { id: 'prefix', text: 'Suggest based on the prefix the user has typed so far', kind: 'functional' },
            { id: 'latency', text: 'Every keystroke returns suggestions in under 100 ms (p99)', kind: 'nonfunctional' },
            { id: 'scale', text: 'Support ~10M DAU and ~10,000 search queries per second', kind: 'nonfunctional' },
            { id: 'fresh', text: 'Newly popular queries appear within a few minutes to an hour', kind: 'nonfunctional' },
            { id: 'avail', text: 'Autocomplete must be highly available — a blank result beats a failure', kind: 'nonfunctional' },
            { id: 'transcode', text: 'Transcode uploaded videos to multiple resolutions', kind: 'functional' },
          ],
          correct: ['suggest', 'rank', 'prefix', 'latency', 'scale', 'fresh', 'avail'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'typeahead-qps',
              label: 'Average typeahead QPS',
              prompt: '10,000 search queries/sec; each typing session fires ~20 autocomplete calls. Average QPS?',
              answer: 200000,
              unit: 'QPS',
            },
            {
              id: 'peak-qps',
              label: 'Peak typeahead QPS',
              prompt: 'Peak traffic is about 2× the average. Peak QPS?',
              answer: 400000,
              unit: 'QPS',
            },
            {
              id: 'phrase-storage',
              label: 'Raw phrase data',
              prompt: '500M distinct phrases at ~50 bytes each (text + frequency). Total raw size?',
              answer: 25,
              unit: 'GB',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'client', label: 'Browser / Client', kind: 'client' },
            { id: 'lb', label: 'API Gateway', kind: 'lb' },
            { id: 'app', label: 'Suggestion Service', kind: 'server' },
            { id: 'cache', label: 'Suggestions Cache (Redis)', kind: 'cache' },
            { id: 'trie', label: 'Trie Store (in-memory)', kind: 'db' },
            { id: 'agg', label: 'Query Log / Offline Aggregator', kind: 'queue' },
            { id: 'trans', label: 'Video Transcoder', kind: 'other' },
          ],
          correctOrder: ['client', 'lb', 'app', 'cache', 'trie'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'The trie is too slow if read from disk on every keystroke. What is the standard fix?',
              options: [
                'Query a full-text search engine instead',
                'Load the entire trie into memory on each suggestion server',
                'Serve suggestions from the CDN edge only',
                'Limit suggestions to English dictionary words',
              ],
              correct: [1],
              explanation: 'A trie of ~500M phrases fits in RAM (tens of GB). In-memory prefix lookups are microseconds — far faster than a disk or DB round-trip per keystroke at 200K QPS.',
              isTricky: true,
            },
            {
              prompt: 'How do you rank by popularity fast enough for the top-K?',
              options: [
                'Walk the whole subtree and sort all leaves on every request',
                'Precompute and store the top-K suggestions at each trie node, offline',
                'Sort suggestions in the database at query time',
                'Return only the single most recent query',
              ],
              correct: [1],
              explanation: 'Precompute the top-K (e.g. top 5) at every node during an offline aggregation job. The server then returns them in O(1) — no subtree walk per keystroke.',
              isTricky: true,
            },
            {
              prompt: 'A phrase explodes in popularity overnight. When do users see it as a suggestion?',
              options: [
                'Immediately on the next keystroke',
                'After the next offline frequency aggregation and trie refresh (minutes to an hour)',
                'Never — suggestions are static for the product lifetime',
                'Only after the user searches it again themselves',
              ],
              correct: [1],
              explanation: 'Popularity is aggregated from search logs in batches. Updated top-K lists are pushed out periodically — client caches and a CDN layer hide the refresh window.',
            },
            {
              prompt: 'Should suggestions be personalized per user at this scale?',
              options: [
                'Yes — run a full ML model per user on every keystroke',
                'Global list with filters (locale, banned/offensive) is the pragmatic default; deep personalization is layered behind the cache for a subset',
                'Always return the same fixed list to everyone',
                'Do all filtering client-side',
              ],
              correct: [1],
              explanation: 'At 200K QPS you serve a highly-cached global list, filtered and boosted by locale. Heavy per-user ML ranking is expensive and usually applied to a small subset or offline.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'Why precompute top-K at each node instead of walking the trie at request time?',
              options: [
                'Walking the subtree is O(size of subtree) — too slow per keystroke; precomputed top-K is O(1)',
                'Precomputing uses less disk space',
                'It lets the trie skip the cache layer',
                'It is the only way to rank suggestions',
              ],
              correct: [0],
              explanation: 'A subtree walk on every keystroke cannot sustain 200K QPS; storing the top-K per node turns the hot path into a constant-time lookup.',
            },
            {
              prompt: 'What makes the trie fast enough to serve hundreds of thousands of QPS?',
              options: [
                'A fast SQL database',
                'It lives in memory on each server',
                'A very large SSD',
                'Precise geohash precision',
              ],
              correct: [1],
              explanation: 'Holding the trie in RAM gives microsecond lookups; a DB or disk-backed structure adds a round-trip the latency budget cannot afford.',
            },
            {
              prompt: 'A blank suggestions box is acceptable, but an error page is not. Which requirement captures this?',
              options: [
                'Freshness',
                'High availability — degrade to empty rather than fail',
                'Ranking',
                'Prefix matching',
              ],
              correct: [1],
              explanation: 'The service must degrade gracefully (return no suggestions) under load or partial failure — availability beats a perfect response.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'video-streaming',
    title: 'Design a Video Streaming Service',
    summary: 'Upload, process, and stream video to millions: chunked adaptive-bitrate playback served from a CDN edge with an async encode pipeline.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'upload', text: 'Accept video uploads and store the original master', kind: 'functional' },
            { id: 'transcode', text: 'Transcode uploads into multiple resolutions and bitrates', kind: 'functional' },
            { id: 'abr', text: 'Stream via adaptive bitrate — segment playlists the player can switch between', kind: 'functional' },
            { id: 'resume', text: 'Support playback progress, resume, and watch analytics', kind: 'functional' },
            { id: 'latency', text: 'Keep start-up and seek latency low (p99 under a few hundred ms)', kind: 'nonfunctional' },
            { id: 'scale', text: 'Handle millions of concurrent viewers and hundreds of hours uploaded per minute', kind: 'nonfunctional' },
            { id: 'avail', text: 'Be highly available and durable — video must never be lost', kind: 'nonfunctional' },
            { id: 'msg', text: 'Support real-time 1:1 chat between users', kind: 'functional' },
          ],
          correct: ['upload', 'transcode', 'abr', 'resume', 'latency', 'scale', 'avail'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'upload-storage',
              label: 'Daily upload storage',
              prompt: '500 hours uploaded per minute, ~2 GB per average encoded hour. Storage per day? (500 × 60 × 2 GB)',
              answer: 60,
              unit: 'TB/day',
            },
            {
              id: 'cdn-bandwidth',
              label: 'Streaming bandwidth',
              prompt: '10M concurrent viewers at ~3 Mbps average. Total bandwidth?',
              answer: 30,
              unit: 'Tbps',
            },
            {
              id: 'watch-minutes',
              label: 'Minutes watched / day',
              prompt: '1M DAU watching ~30 minutes each per day. Total minutes served per day?',
              answer: 30000000,
              unit: 'min/day',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'client', label: 'Video Player', kind: 'client' },
            { id: 'cdn', label: 'CDN Edge (segments + playlists)', kind: 'cdn' },
            { id: 'lb', label: 'API Gateway', kind: 'lb' },
            { id: 'app', label: 'Streaming / Metadata Service', kind: 'server' },
            { id: 'cache', label: 'Popular Content Cache', kind: 'cache' },
            { id: 'db', label: 'Catalog / Metadata DB', kind: 'db' },
            { id: 'trans', label: 'Transcoder (encode farm)', kind: 'other' },
            { id: 'queue', label: 'Encode Job Queue', kind: 'queue' },
          ],
          correctOrder: ['client', 'cdn', 'lb', 'app', 'cache', 'db'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'Why split each video into short chunks (2–10 s) referenced by a playlist (HLS/DASH)?',
              options: [
                'To shrink the file on disk',
                'To enable adaptive bitrate — the player picks the bitrate per chunk based on current bandwidth',
                'To make the upload finish faster',
                'To avoid needing a CDN at all',
              ],
              correct: [1],
              explanation: 'Segments + a manifest of quality variants let the player switch bitrate mid-stream, avoiding rebuffering as bandwidth fluctuates. Disk size and upload speed are not the point.',
              isTricky: true,
            },
            {
              prompt: 'A viewer\'s network degrades mid-stream. What actually happens?',
              options: [
                'The stream stops until the network recovers',
                'The player fetches a lower-bitrate variant from the next manifest and continues seamlessly',
                'The server re-encodes the video on the fly',
                'The app shows an error and reloads',
              ],
              correct: [1],
              explanation: 'The player monitors throughput/rebuffers, then requests chunks from a lower-resolution rendition listed in the manifest — a core adaptive-bitrate behavior.',
            },
            {
              prompt: 'Most playback requests should be served by…',
              options: [
                'The transcoder',
                'The CDN edge, with the origin as fallback on cache miss',
                'The metadata database',
                'The job queue',
              ],
              correct: [1],
              explanation: 'Hot content is cached at edge locations close to viewers (low latency) and CDN caching offloads bandwidth from the origin, cutting cost and load.',
              isTricky: true,
            },
            {
              prompt: 'Why is transcoding done asynchronously through a job queue?',
              options: [
                'Encoding is CPU-heavy and slow — async lets uploads return immediately and the encode farm scale independently',
                'Encoding must happen before the upload',
                'It keeps the CDN warm',
                'It replaces the need for a catalog',
              ],
              correct: [0],
              explanation: 'Encoding hours of video takes time. Decouple via a queue so ingest responds fast and workers can be scaled out horizontally.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'Which component actually serves the video bytes during playback?',
              options: ['The transcoder', 'The CDN edge', 'The metadata DB', 'The job queue'],
              correct: [1],
              explanation: 'The player downloads segments from the CDN edge; everything else supports ingest, cataloging, and cache misses.',
            },
            {
              prompt: 'The upload pipeline\'s core decoupling point is…',
              options: ['The CDN', 'The encode job queue between ingest and transcoding', 'The API gateway', 'The player'],
              correct: [1],
              explanation: 'Uploads enqueue encode jobs; workers transcode and publish finished segments to the CDN/origin — the queue lets each stage scale independently.',
            },
            {
              prompt: 'Adaptive bitrate works because the player…',
              options: [
                'Downloads the whole video in one file',
                'Requests short segments from a manifest of quality variants, switching per segment',
                'Relies on the server to push quality changes',
                'Only ever plays one resolution',
              ],
              correct: [1],
              explanation: 'Per-segment requests from a multi-variant manifest are what make quality switching possible without restarting playback.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'proximity-friends',
    title: 'Design Nearby Friends (Proximity)',
    summary: 'Show which friends are within a few kilometers right now: continuous location pings, a spatial index for low-latency radius queries, and privacy controls.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'nearby', text: 'Show which friends are within a configurable radius (e.g. 5 km) of the user', kind: 'functional' },
            { id: 'ping', text: 'Users update their location continuously (e.g. every 30 seconds)', kind: 'functional' },
            { id: 'privacy', text: 'Support privacy: visible to friends only, plus a ghost mode to hide location', kind: 'functional' },
            { id: 'latency', text: 'Nearby queries return in under 200 ms (p99)', kind: 'nonfunctional' },
            { id: 'scale', text: 'Support 100M+ users and millions of concurrent location updates', kind: 'nonfunctional' },
            { id: 'avail', text: 'Be highly available — the feature must survive partial failures', kind: 'nonfunctional' },
            { id: 'precision', text: 'Cell-level distance accuracy is acceptable; exact meters are not required', kind: 'nonfunctional' },
            { id: 'shorten', text: 'Shorten long URLs into redirect codes', kind: 'functional' },
          ],
          correct: ['nearby', 'ping', 'privacy', 'latency', 'scale', 'avail', 'precision'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'update-writes',
              label: 'Location update writes',
              prompt: '30M active users ping once every 30 seconds on average. Location writes per second?',
              answer: 1000000,
              unit: 'writes/s',
            },
            {
              id: 'nearby-qps',
              label: 'Nearby query QPS',
              prompt: '10% of active users query "nearby friends" once a minute on average. QPS?',
              answer: 50000,
              unit: 'QPS',
            },
            {
              id: 'location-storage',
              label: 'Last-known-location store',
              prompt: '100M users × ~50 bytes each (id + lat/lon + timestamp). Total size?',
              answer: 5,
              unit: 'GB',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'client', label: 'Phone / App', kind: 'client' },
            { id: 'lb', label: 'API Gateway', kind: 'lb' },
            { id: 'app', label: 'Nearby / Presence Service', kind: 'server' },
            { id: 'cache', label: 'Geo Index (Redis GEO)', kind: 'cache' },
            { id: 'db', label: 'Location + User Store', kind: 'db' },
            { id: 'queue', label: 'Location Update Queue', kind: 'queue' },
            { id: 'trans', label: 'Video Transcoder', kind: 'other' },
          ],
          correctOrder: ['client', 'lb', 'app', 'cache', 'db'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'Geohash cells have an edge problem: two users a few meters apart can get very different hashes if they straddle a boundary. How do you handle it?',
              options: [
                'Ignore it — cell precision is good enough',
                'Query the target cell plus all 8 neighboring cells, then filter by exact distance',
                'Use as many hash characters as possible',
                'Use a flat grid with no boundaries',
              ],
              correct: [1],
              explanation: 'Include the 8 surrounding cells in the search and filter candidates by true distance. This is the standard fix for the geohash boundary/precision pitfall.',
              isTricky: true,
            },
            {
              prompt: 'Redis GEO stores points in a sorted set keyed by geohash. Its main advantage here is…',
              options: [
                'Storing full user profiles',
                'Very low-latency radius search (GEOSEARCH) in memory',
                'Replacing the user database',
                'Running ML ranking',
              ],
              correct: [1],
              explanation: 'Redis GEOSEARCH returns members within a radius or box in O(N + log M) in memory — perfect for the 50K QPS and sub-200 ms budget.',
            },
            {
              prompt: 'Why is a hexagonal grid (H3) sometimes preferred over square geohash cells?',
              options: [
                'Hexagons have uniform neighbor distance and kRing approximates circles natively',
                'Hexagons need fewer bits to store',
                'Squares cannot be hierarchical',
                'H3 avoids the need for any precision',
              ],
              correct: [0],
              explanation: 'Square grids have two neighbor distances (edge vs corner) and distort circle queries; hexagons give one uniform distance and H3 kRing builds clean circular neighborhoods.',
              isTricky: true,
            },
            {
              prompt: 'At ~1M location writes/sec you should NOT…',
              options: [
                'Write to an in-memory index first and persist asynchronously',
                'Flood a disk-backed relational DB synchronously on every ping',
                'Batch and dedupe updates per user',
                'Use Redis GEO for the hot index',
              ],
              correct: [1],
              explanation: 'A synchronous DB write per ping cannot absorb 1M writes/sec. The hot spatial index lives in memory; persistence happens asynchronously behind it.',
            },
            {
              prompt: 'Privacy: how do you stop a user from appearing in another user\'s "nearby" results?',
              options: [
                'You cannot — location is always visible',
                'Filter at query time using friendship and privacy settings (and drop ghosted users before indexing)',
                'Delete the app',
                'Round coordinates to a whole city',
              ],
              correct: [1],
              explanation: 'The nearby service checks the requester\'s friend graph + the target\'s privacy flag (incl. ghost mode) and excludes hidden users before returning results.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'The best structure for "all users within radius R of a point, fast" is…',
              options: [
                'A full scan of the user table',
                'A spatial index — geohash (Redis GEO) or an H3 kRing',
                'A B-Tree on user ID',
                'A message queue',
              ],
              correct: [1],
              explanation: 'Spatial indexes are designed for radius/neighbor queries; the alternatives cannot do it without scanning everything.',
            },
            {
              prompt: 'Why must you include neighboring cells when searching by geohash prefix?',
              options: [
                'To make results longer',
                'Points near a cell boundary can hash into different cells than the query center',
                'Neighbor cells store profiles',
                'There is no reason',
              ],
              correct: [1],
              explanation: 'Two physically close points can get different hashes across a boundary, so you search the cell plus its neighbors and filter by real distance.',
            },
            {
              prompt: 'Where does the hot spatial index live, and why?',
              options: [
                'On disk — for durability',
                'In memory (e.g. Redis) — for the write volume and latency budget',
                'In the CDN',
                'In the transcoder',
              ],
              correct: [1],
              explanation: 'The ~1M writes/sec and sub-200 ms latency force an in-memory index; durability is handled by async persistence behind it.',
            },
          ],
        },
      },
    ],
  },

  {
    slug: 'distributed-message-queue',
    title: 'Design a Distributed Message Queue',
    summary: 'A Kafka-style log: producers append to partitions, consumers read with offsets, ordering is preserved per partition, and the log is replicated for durability.',
    steps: [
      {
        id: 'requirements',
        label: 'Requirements',
        type: 'requirements',
        content: {
          options: [
            { id: 'publish', text: 'Producers publish messages to a topic', kind: 'functional' },
            { id: 'consume', text: 'Consumers read messages by pulling from the queue with per-partition ordering', kind: 'functional' },
            { id: 'groups', text: 'Support multiple consumer groups that each read the same topic independently', kind: 'functional' },
            { id: 'retention', text: 'Retain messages for a configurable period so they can be replayed', kind: 'functional' },
            { id: 'scale', text: 'Scale horizontally via partitions to millions of messages per second', kind: 'nonfunctional' },
            { id: 'delivery', text: 'Guarantee at-least-once delivery — no loss, duplicates allowed', kind: 'nonfunctional' },
            { id: 'durable', text: 'Survive broker failure through replication (leader + followers)', kind: 'nonfunctional' },
            { id: 'cdn', text: 'Serve video segments from edge locations', kind: 'functional' },
          ],
          correct: ['publish', 'consume', 'groups', 'retention', 'scale', 'delivery', 'durable'],
        },
      },
      {
        id: 'estimation',
        label: 'Estimation',
        type: 'estimation',
        content: {
          items: [
            {
              id: 'write-throughput',
              label: 'Publish throughput',
              prompt: 'A topic receives 1M messages per second. Messages per second?',
              answer: 1000000,
              unit: 'msg/s',
            },
            {
              id: 'retention-storage',
              label: '1-day retention storage',
              prompt: '1M msg/s × 86,400 s/day at ~1 KB per message. Storage for one day of retention?',
              answer: 86.4,
              unit: 'TB/day',
            },
            {
              id: 'max-consumers',
              label: 'Max consumers per group',
              prompt: 'A topic has 128 partitions. Maximum parallel consumers within one consumer group?',
              answer: 128,
              unit: 'consumers',
            },
          ],
        },
      },
      {
        id: 'assemble',
        label: 'Assemble the system',
        type: 'assemble',
        content: {
          components: [
            { id: 'producer', label: 'Producers (apps)', kind: 'client' },
            { id: 'broker', label: 'Broker Cluster', kind: 'server' },
            { id: 'storage', label: 'Partition Log (durable disk)', kind: 'db' },
            { id: 'meta', label: 'Cluster Coordinator (KRaft)', kind: 'other' },
            { id: 'consumer', label: 'Consumers (groups)', kind: 'client' },
            { id: 'cdn', label: 'CDN Edge', kind: 'cdn' },
          ],
          correctOrder: ['producer', 'broker', 'storage', 'consumer'],
        },
      },
      {
        id: 'deep-dive',
        label: 'Deep dive: trade-offs',
        type: 'deepdive',
        content: {
          questions: [
            {
              prompt: 'How do you keep ordering guarantees while still scaling out?',
              options: [
                'Guarantee global order across all messages',
                'Order within a partition — pick the partition key so related messages land in the same partition',
                'Provide no ordering guarantee at all',
                'Sort everything at the consumer',
              ],
              correct: [1],
              explanation: 'Kafka orders within a partition, not globally. Choosing a key (e.g. user id) routes related messages to one partition, giving you per-entity ordering at massive throughput.',
              isTricky: true,
            },
            {
              prompt: 'A consumer group has 200 consumers but the topic has 128 partitions. What happens?',
              options: [
                'All 200 consumers read in parallel',
                'Only ~128 consumers actively read; the rest sit idle',
                'Partitions are duplicated to feed every consumer',
                'The group is rejected',
              ],
              correct: [1],
              explanation: 'Each partition is consumed by at most one consumer in a group. More consumers than partitions means idle consumers — partitions cap group parallelism.',
              isTricky: true,
            },
            {
              prompt: 'Delivery is at-least-once: duplicates are possible. What must consumers do?',
              options: [
                'Nothing — duplicates are harmless',
                'Be idempotent — dedupe by message ID so re-delivery is safe',
                'Disable the queue',
                'Only read once ever',
              ],
              correct: [1],
              explanation: 'At-least-once means the same message may be delivered again after a crash. Consumers must tolerate that, typically by deduplicating on an idempotency key.',
            },
            {
              prompt: 'Why is a pull (poll) model better than the broker pushing messages?',
              options: [
                'Push delivers lower latency',
                'Pull lets consumers control their own pace — a slow consumer creates backpressure instead of overloading the broker',
                'Pull uses less disk',
                'Push cannot replicate',
              ],
              correct: [1],
              explanation: 'With pull, the consumer reads at its own rate. Push can overwhelm slow consumers and force the broker to buffer, which complicates backpressure.',
            },
            {
              prompt: 'How do you make the log durable and available across broker failures?',
              options: [
                'Store everything in one broker',
                'Replicate each partition to multiple brokers (leader + in-sync followers) and ack after a quorum',
                'Keep the log only in memory',
                'Back up to a CDN',
              ],
              correct: [1],
              explanation: 'Each partition leader replicates to followers; writes are acked once the in-sync replica (ISR) set confirms. If the leader fails, a follower takes over.',
            },
          ],
        },
      },
      {
        id: 'quiz',
        label: 'Recap quiz',
        type: 'quiz',
        content: {
          questions: [
            {
              prompt: 'The unit of parallel read/write within a Kafka-style topic is the…',
              options: ['Consumer group', 'Partition', 'Offset', 'Broker rack'],
              correct: [1],
              explanation: 'Topics are split into partitions; ordering and parallelism both live at the partition level.',
            },
            {
              prompt: 'To keep all messages about one user in order, you…',
              options: [
                'Send them to random partitions',
                'Route them with the same partition key (e.g. user id)',
                'Let the consumer sort them',
                'Use a global lock',
              ],
              correct: [1],
              explanation: 'The partition key determines which partition a message lands in; same key → same partition → preserved order.',
            },
            {
              prompt: 'Under at-least-once delivery, a consumer that crashes after processing but before committing its offset will…',
              options: [
                'Lose the message forever',
                'Receive the same message again — so processing must be idempotent',
                'Never be allowed to rejoin',
                'Skip to the newest message',
              ],
              correct: [1],
              explanation: 'The offset moves only on commit; a crash between processing and commit causes a redelivery. Idempotent processing handles it.',
            },
          ],
        },
      },
    ],
  },
]
