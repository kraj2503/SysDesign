import type { SeedTopic } from '../../types'

export const topics: SeedTopic[] = [
  {
    slug: 'scale-from-zero-to-millions',
    title: 'Scale from Zero to Millions',
    summary: 'Vertical vs horizontal scaling, and the progression from a single server to a load-balanced, cached, database-backed architecture.',
    icon: '🚀',
  },
  {
    slug: 'back-of-the-envelope-estimation',
    title: 'Back-of-the-Envelope Estimation',
    summary: 'QPS, storage, bandwidth, and availability math — the numbers you need before designing anything.',
    icon: '🧮',
  },
  {
    slug: 'latency-throughput-availability',
    title: 'Latency, Throughput & Availability',
    summary: 'The three metrics that define system performance and reliability — and the nines you must not mix up.',
    icon: '⏱️',
  },
  {
    slug: 'cap-and-consistency-models',
    title: 'CAP & Consistency Models',
    summary: 'CAP, PACELC, strong vs eventual vs causal consistency, ACID vs BASE.',
    icon: '🔺',
  },
  {
    slug: 'load-balancing',
    title: 'Load Balancing',
    summary: 'L4 vs L7, algorithms, health checks, and where load balancers sit in a system.',
    icon: '⚖️',
  },
  {
    slug: 'caching',
    title: 'Caching',
    summary: 'Write policies, cache-aside, eviction strategies, invalidation, and cache attacks.',
    icon: '⚡',
  },
  {
    slug: 'databases',
    title: 'Databases',
    summary: 'SQL vs NoSQL, indexing, B-Tree vs LSM, connection pooling, read replicas.',
    icon: '🗄️',
  },
  {
    slug: 'sharding-and-partitioning',
    title: 'Sharding & Partitioning',
    summary: 'Range vs hash partitioning, consistent hashing, rebalancing, and hot keys.',
    icon: '🧩',
  },
  {
    slug: 'replication-and-consensus',
    title: 'Replication & Consensus',
    summary: 'Leader-follower, quorum reads/writes, Raft/Paxos, and split-brain problems.',
    icon: '🔁',
  },
  {
    slug: 'message-queues-and-async',
    title: 'Message Queues & Async',
    summary: 'Kafka-style pub/sub, delivery semantics, backpressure, and why async scales.',
    icon: '📨',
  },
  {
    slug: 'microservices-and-api-design',
    title: 'Microservices & API Design',
    summary: 'Monolith vs microservices, orchestration vs choreography, REST vs GraphQL vs gRPC.',
    icon: '🏗️',
  },
  {
    slug: 'cdn-and-edge',
    title: 'CDN & Edge Computing',
    summary: 'Origin vs edge, cache headers, and DNS-based routing.',
    icon: '🌐',
  },
  {
    slug: 'observability-and-reliability',
    title: 'Observability & Reliability',
    summary: 'Logs, metrics, traces, alerting, failover, and disaster recovery.',
    icon: '📈',
  },
]
