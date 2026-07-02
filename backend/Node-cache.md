# GOODSYNC ERP Backend

This repository houses the high-performance, multi-tenant backend architecture designed for the GOODSYNC ERP platform, optimized to support 2,000 to 3,000+ active concurrent users with low-latency execution and strict data isolation.

## 🚀 Recent Optimizations & Implementations

We have systematically eliminated application bottlenecks across our routing, middleware, configurations, real-time communications, and database query layers.

---

### 1. Multi-Tenant Dynamic Cache Layer (`node-cache`)
To prevent repetitive database operations across dynamic tenant connections, we integrated an in-memory caching mechanism.
* **School Context & Configurations:** Core institutional settings, environment parameters, and active student metadata are cached in-memory with a standard TTL (Time-To-Live) of 5 minutes (300 seconds).
* **Instant Cache Invalidation:** Implemented explicit cache purging hooks (`academicCache.del`) directly inside data modification pipelines (such as updating academic years). When an administrator modifies core operational settings, stale cache entries are immediately removed so users pick up updates instantly.

### 2. Multi-Tenant Safe Schemas & Compile Guard
To protect our dynamic multi-tenant workspace architecture from crashing under high operational stress, schema compiles have been fortified.
* Implemented compile safety guards across Mongoose data models (`mongoose.models.User || mongoose.model('User', userSchema)`).
* This explicitly prevents fatal `OverwriteModelError` crashes when the `DatabaseManager` shifts connection pools back and forth across different tenant namespaces.

### 3. Real-Time Socket.io Performance Enhancement
Real-time dispatch pipelines—such as SOS triggers and instantaneous notification broadcasting—previously hit bottleneck limits during direct database query iterations.
* Leveraged dedicated caching logic (`socketProfileCache`) directly within the socket listener environment in `server.js`.
* Essential emergency routing data, guardian contact info, and device registration tokens are resolved directly from memory rather than stalling the event loop on blocking MongoDB lookups.

### 4. Database Query Strategy & Background Indexing
To support the cache infrastructure during cold starts and cache misses, collection structures were optimized using targeted Mongoose background indexes to avoid heavy collection scans (`COLLSCAN`).

| Model / Collection | Indexed Fields | Structural Purpose |
| :--- | :--- | :--- |
| **User** | `schoolId: 1`, `role: 1`, `studentDetails.currentClass: 1` | Accelerates target student roster assemblies and auth context mapping. |
| **Assignment** | `schoolId: 1`, `status: 1`, `dueDate: 1` | Dramatically reduces resource costs for dashboard analytics aggregations. |
| **Attendance** | `schoolId: 1`, `date: -1`, `class: 1` | Crucial for handling peak morning traffic when thousands of records process concurrently. |

---

## 🛠️ Verification & Startup Checklist

Before deploying changes or committing dependencies, verify your local system environments match configuration baselines:

1. **Install Dependencies:**
   ```bash
   npm install