# 04: Dependency Detection & External Database Discovery

**What to build:**
Enhanced static code inspection in the Python engine that inspects project files (e.g. `package.json`, `.env.example`, `requirements.txt`, Dockerfiles) to automatically detect external database dependencies (PostgreSQL, MySQL, Redis, MongoDB, MariaDB) and identify the specific driver or ORM (Prisma, TypeORM, Mongoose, Sequelize, pg).

**Blocked by:** 02 (Multi-Source Code Ingestion)

**Status:** completed

- [x] Static analyzer scanning manifest files and source imports for database drivers and client packages
- [x] Detection of required database types (`postgres`, `mysql`, `redis`, `mongodb`) and default port mappings
- [x] Extraction of required environment variable names (e.g. `DATABASE_URL`, `REDIS_URI`, `POSTGRES_PASSWORD`)
- [x] Agent conversational summary in Persian explaining detected dependencies and required cloud services
- [x] Unit tests for multi-language dependency detection across Node.js, Python, and generic projects

