# 04: Dependency Detection & External Database Discovery

**What to build:**
Enhanced static code inspection in the Python engine that inspects project files (e.g. `package.json`, `.env.example`, `requirements.txt`, Dockerfiles) to automatically detect external database dependencies (PostgreSQL, MySQL, Redis, MongoDB, MariaDB) and identify the specific driver or ORM (Prisma, TypeORM, Mongoose, Sequelize, pg).

**Blocked by:** 02 (Multi-Source Code Ingestion)

**Status:** ready-for-agent

- [ ] Static analyzer scanning manifest files and source imports for database drivers and client packages
- [ ] Detection of required database types (`postgres`, `mysql`, `redis`, `mongodb`) and default port mappings
- [ ] Extraction of required environment variable names (e.g. `DATABASE_URL`, `REDIS_URI`, `POSTGRES_PASSWORD`)
- [ ] Agent conversational summary in Persian explaining detected dependencies and required cloud services
- [ ] Unit tests for multi-language dependency detection across Node.js, Python, and generic projects

