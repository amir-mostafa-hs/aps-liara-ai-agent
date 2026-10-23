import json
import os
import re
from pathlib import Path
from engine.domain.models import (
    DetectedDatabase,
    EnvironmentVariableRequirement,
    ProjectAnalysis,
)

DB_MAPPINGS = {
    "postgres": {
        "packages": {
            "node": ["pg", "pg-promise", "postgres", "@prisma/client", "typeorm", "sequelize", "knex"],
            "python": ["psycopg2", "psycopg2-binary", "psycopg", "asyncpg", "databases"],
        },
        "default_port": 5432,
        "suggested_env_vars": ["DATABASE_URL", "POSTGRES_PASSWORD", "POSTGRES_USER", "POSTGRES_DB"],
        "display_name": "PostgreSQL",
    },
    "mysql": {
        "packages": {
            "node": ["mysql", "mysql2"],
            "python": ["mysqlclient", "pymysql", "aiomysql"],
        },
        "default_port": 3306,
        "suggested_env_vars": ["DATABASE_URL", "MYSQL_ROOT_PASSWORD", "MYSQL_DATABASE"],
        "display_name": "MySQL",
    },
    "redis": {
        "packages": {
            "node": ["redis", "ioredis"],
            "python": ["redis", "aioredis"],
        },
        "default_port": 6379,
        "suggested_env_vars": ["REDIS_URL", "REDIS_HOST", "REDIS_PORT"],
        "display_name": "Redis",
    },
    "mongodb": {
        "packages": {
            "node": ["mongodb", "mongoose"],
            "python": ["pymongo", "motor"],
        },
        "default_port": 27017,
        "suggested_env_vars": ["MONGODB_URI", "MONGO_URL"],
        "display_name": "MongoDB",
    },
    "mariadb": {
        "packages": {
            "node": ["mariadb"],
            "python": ["mariadb"],
        },
        "default_port": 3306,
        "suggested_env_vars": ["DATABASE_URL", "MARIADB_ROOT_PASSWORD"],
        "display_name": "MariaDB",
    },
}

PLATFORM_ENV_NAMES = {"PORT"}
PLACEHOLDER_VALUE = re.compile(
    r"(?i)(demo|sample|example|placeholder|changeme|change-me|replace|your[-_ ]|xxxx|<[^>]+>)"
)
GENERATED_SECRET_NAME = re.compile(
    r"(?i)(^|_)(secret|password|passphrase|private_key|encryption_key)($|_)"
)
EXTERNAL_CREDENTIAL_NAME = re.compile(
    r"(?i)(^|_)(api_key|access_token|client_secret|credential|stripe|openai|anthropic|github|google|aws|twilio|sendgrid|resend|paypal)($|_)"
)
EXTERNAL_SERVICE_CREDENTIAL = re.compile(
    r"(?i)^(stripe|openai|github|aws|sentry|sendgrid|resend|twilio|liara|cloudflare|supabase|firebase|google|vercel|anthropic)_.*(key|secret|token|credential)"
)

LIARA_PLATFORM_ALIASES = {
    "node": "nodejs",
    "node.js": "nodejs",
    "javascript": "nodejs",
    "nextjs": "next",
    "next.js": "next",
    "python3": "python",
    ".net core": "netcore",
}
LIARA_SUPPORTED_PLATFORMS = {
    "static", "docker", "nodejs", "laravel", "react", "vue", "angular",
    "django", "php", "flask", "netcore", "dotnet", "next", "python", "go",
}


def normalize_detected_platform(value: str | None) -> str | None:
    normalized = (value or "").strip().lower()
    canonical = LIARA_PLATFORM_ALIASES.get(normalized, normalized)
    return canonical if canonical in LIARA_SUPPORTED_PLATFORMS else None


class ProjectInspector:
    def __init__(self, allowed_roots: list[str] | None = None):
        if allowed_roots is None:
            repo_root = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../..")
            )
            self.allowed_roots = [repo_root]
        else:
            self.allowed_roots = [os.path.abspath(r) for r in allowed_roots]

    def validate_path(self, raw_path: str) -> Path:
        if not raw_path or not raw_path.strip():
            raise ValueError("Project path cannot be empty.")

        abs_path = os.path.abspath(os.path.expanduser(raw_path.strip()))
        resolved = Path(abs_path).resolve()

        is_allowed = any(
            str(resolved).startswith(allowed) for allowed in self.allowed_roots
        )
        if not is_allowed:
            raise PermissionError(
                f"Path traversal detected: Path '{raw_path}' is outside allowed workspace boundaries."
            )

        if not resolved.exists():
            raise FileNotFoundError(f"Directory does not exist: {raw_path}")

        if not resolved.is_dir():
            raise ValueError(f"Path is not a directory: {raw_path}")

        return resolved

    def _detect_databases(
        self,
        root: Path,
        pkg_data: dict | None,
        requirements_text: str | None,
        env_vars: set[str],
        evidence_files: list[str],
    ) -> list[DetectedDatabase]:
        detected_map: dict[str, DetectedDatabase] = {}

        # 1. Inspect package.json dependencies
        if pkg_data:
            deps = {**pkg_data.get("dependencies", {}), **pkg_data.get("devDependencies", {})}
            for db_type, meta in DB_MAPPINGS.items():
                node_pkgs = meta["packages"].get("node", [])
                for pkg in node_pkgs:
                    if pkg in deps:
                        if db_type not in detected_map:
                            detected_map[db_type] = DetectedDatabase(
                                db_type=db_type,
                                driver_or_orm=pkg,
                                default_port=meta["default_port"],
                                suggested_env_vars=meta["suggested_env_vars"],
                                evidence=f"package.json: {pkg}",
                            )

        # 2. Inspect requirements.txt
        if requirements_text:
            lines = [l.strip().lower() for l in requirements_text.splitlines() if l.strip() and not l.startswith("#")]
            for db_type, meta in DB_MAPPINGS.items():
                py_pkgs = meta["packages"].get("python", [])
                for pkg in py_pkgs:
                    if any(pkg in line for line in lines):
                        if db_type not in detected_map:
                            detected_map[db_type] = DetectedDatabase(
                                db_type=db_type,
                                driver_or_orm=pkg,
                                default_port=meta["default_port"],
                                suggested_env_vars=meta["suggested_env_vars"],
                                evidence=f"requirements.txt: {pkg}",
                            )

        # 3. Inspect Prisma Schema
        prisma_path = root / "prisma" / "schema.prisma"
        if prisma_path.is_file():
            evidence_files.append("prisma/schema.prisma")
            try:
                content = prisma_path.read_text(encoding="utf-8")
                provider_match = re.search(r'provider\s*=\s*"([^"]+)"', content)
                if provider_match:
                    provider = provider_match.group(1).lower()
                    if provider in ["postgresql", "postgres"]:
                        detected_map["postgres"] = DetectedDatabase(
                            db_type="postgres",
                            driver_or_orm="prisma",
                            default_port=5432,
                            suggested_env_vars=["DATABASE_URL"],
                            evidence="prisma/schema.prisma: provider=postgresql",
                        )
                    elif provider == "mysql":
                        detected_map["mysql"] = DetectedDatabase(
                            db_type="mysql",
                            driver_or_orm="prisma",
                            default_port=3306,
                            suggested_env_vars=["DATABASE_URL"],
                            evidence="prisma/schema.prisma: provider=mysql",
                        )
                    elif provider == "mongodb":
                        detected_map["mongodb"] = DetectedDatabase(
                            db_type="mongodb",
                            driver_or_orm="prisma",
                            default_port=27017,
                            suggested_env_vars=["DATABASE_URL"],
                            evidence="prisma/schema.prisma: provider=mongodb",
                        )
            except Exception:
                pass

        # 4. Check env var names for explicit signals if not detected yet
        for env in env_vars:
            env_upper = env.upper()
            if "REDIS" in env_upper and "redis" not in detected_map:
                detected_map["redis"] = DetectedDatabase(
                    db_type="redis",
                    driver_or_orm="generic-redis",
                    default_port=6379,
                    suggested_env_vars=["REDIS_URL"],
                    evidence=f"env variable: {env}",
                )
            elif "MONGO" in env_upper and "mongodb" not in detected_map:
                detected_map["mongodb"] = DetectedDatabase(
                    db_type="mongodb",
                    driver_or_orm="generic-mongodb",
                    default_port=27017,
                    suggested_env_vars=["MONGODB_URI"],
                    evidence=f"env variable: {env}",
                )

        return list(detected_map.values())

    def _generate_persian_summary(
        self, platform: str, databases: list[DetectedDatabase], port: int
    ) -> str:
        platform_fa = {
            "nodejs": "Node.js (جاوااسکریپت)",
            "next": "Next.js",
            "react": "React",
            "vue": "Vue",
            "angular": "Angular",
            "python": "پایتون (Python)",
            "django": "Django (پایتون)",
            "flask": "Flask (پایتون)",
            "laravel": "Laravel (PHP)",
            "php": "PHP",
            "go": "Go",
            "dotnet": ".NET",
            "netcore": ".NET Core",
            "docker": "داکر (Dockerfile)",
            "static": "وب استاتیک (HTML/CSS)",
        }.get(platform, platform)

        if not databases:
            return (
                f"پروژه شما به عنوان یک سرویس {platform_fa} با پورت {port} شناسایی شد. "
                "وابستگی مستقیمی به پایگاه داده خارجی در بسته‌ها یافت نشد."
            )

        db_names = [
            DB_MAPPINGS.get(db.db_type, {}).get("display_name", db.db_type)
            for db in databases
        ]
        db_list_str = "، ".join(db_names)
        return (
            f"پروژه شما به عنوان یک سرویس {platform_fa} با پورت {port} شناسایی شد. "
            f"وابستگی به پایگاه داده ({db_list_str}) در کدهای پروژه تشخیص داده شد. "
            "برای اجرای پایدار و دپلوی موفق، این سرویس‌ها باید روی لیارا ایجاد و مقادیر اتصال به آن تزریق شوند."
        )

    def inspect(self, raw_path: str) -> ProjectAnalysis:
        root = self.validate_path(raw_path)

        evidence_files: list[str] = []
        required_envs: set[str] = set()
        optional_envs: set[str] = set()
        env_evidence: dict[str, set[str]] = {}
        env_example_values: dict[str, str] = {}
        missing_configs: list[str] = []

        detected_platform = "unknown"
        detected_language = "unknown"
        confidence = 0.0
        start_command = None
        entrypoint = None
        port = 3000
        pkg_data: dict | None = None
        requirements_text: str | None = None
        has_liara_json = False
        existing_app_name: str | None = None
        configured_platform: str | None = None

        # Clean folder-based suggested app name (e.g. nodejs-demo)
        clean_slug = re.sub(r"[^a-zA-Z0-9-]", "-", root.name.lower()).strip("-")
        suggested_app_name = clean_slug if clean_slug else "my-app"

        # 1. Check liara.json if present
        liara_json_path = root / "liara.json"
        if liara_json_path.is_file():
            has_liara_json = True
            evidence_files.append("liara.json")
            try:
                with open(liara_json_path, "r", encoding="utf-8") as f:
                    liara_data = json.load(f)
                    if "app" in liara_data and isinstance(liara_data["app"], str) and liara_data["app"].strip():
                        existing_app_name = liara_data["app"].strip()
                    if "port" in liara_data:
                        port = int(liara_data["port"])
                    if isinstance(liara_data.get("platform"), str):
                        configured_platform = normalize_detected_platform(liara_data["platform"])
            except Exception:
                missing_configs.append("Malformed liara.json configuration file.")

        # 2. Check Node.js: package.json
        pkg_path = root / "package.json"
        if pkg_path.is_file():
            evidence_files.append("package.json")
            detected_platform = "nodejs"
            detected_language = "javascript"
            confidence = max(confidence, 0.9)

            try:
                with open(pkg_path, "r", encoding="utf-8") as f:
                    pkg_data = json.load(f)
                    scripts = pkg_data.get("scripts", {})
                    if "start" in scripts:
                        start_command = scripts["start"]
                    entrypoint = pkg_data.get("main")
                    dependencies = {
                        **(pkg_data.get("dependencies") or {}),
                        **(pkg_data.get("devDependencies") or {}),
                    }
                    if "next" in dependencies:
                        detected_platform = "next"
                    elif "@angular/core" in dependencies:
                        detected_platform = "angular"
                    elif "vue" in dependencies:
                        detected_platform = "vue"
                    elif "react" in dependencies:
                        detected_platform = "react"
            except Exception:
                missing_configs.append("Malformed package.json file.")

        # 3. Check Python project manifests and framework dependencies.
        req_path = root / "requirements.txt"
        pyproject_path = root / "pyproject.toml"
        python_manifest_text = ""
        for python_manifest in (req_path, pyproject_path):
            if python_manifest.is_file():
                evidence_files.append(python_manifest.name)
                try:
                    python_manifest_text += "\n" + python_manifest.read_text(encoding="utf-8")
                except Exception:
                    pass
        if req_path.is_file():
            try:
                requirements_text = req_path.read_text(encoding="utf-8")
            except Exception:
                pass

        if detected_platform == "unknown" and python_manifest_text:
            normalized_python_manifest = python_manifest_text.lower()
            if (root / "manage.py").is_file():
                evidence_files.append("manage.py")
            if (root / "manage.py").is_file() or re.search(r"\bdjango\b", normalized_python_manifest):
                detected_platform = "django"
            elif re.search(r"\bflask\b", normalized_python_manifest):
                detected_platform = "flask"
            else:
                detected_platform = "python"
            detected_language = "python"
            confidence = max(confidence, 0.9)
        elif detected_platform == "unknown" and (root / "manage.py").is_file():
            evidence_files.append("manage.py")
            detected_platform = "django"
            detected_language = "python"
            confidence = max(confidence, 0.9)

        # 4. Detect PHP/Laravel, Go, .NET, Docker, and static projects from manifests.
        composer_path = root / "composer.json"
        if detected_platform == "unknown" and composer_path.is_file():
            evidence_files.append("composer.json")
            try:
                composer_data = json.loads(composer_path.read_text(encoding="utf-8"))
                composer_requirements = {
                    **composer_data.get("require", {}),
                    **composer_data.get("require-dev", {}),
                }
                detected_platform = "laravel" if "laravel/framework" in composer_requirements or (root / "artisan").is_file() else "php"
                detected_language = "php"
                confidence = max(confidence, 0.9)
            except Exception:
                missing_configs.append("Malformed composer.json file.")

        if detected_platform == "unknown" and (root / "go.mod").is_file():
            evidence_files.append("go.mod")
            detected_platform = "go"
            detected_language = "go"
            confidence = max(confidence, 0.9)

        dotnet_manifests = [*root.glob("*.csproj"), *root.glob("*.fsproj"), *root.glob("*.vbproj")]
        if detected_platform == "unknown" and dotnet_manifests:
            evidence_files.extend(path.name for path in dotnet_manifests)
            detected_platform = "dotnet"
            detected_language = "csharp"
            confidence = max(confidence, 0.9)

        if detected_platform == "unknown" and (root / "Dockerfile").is_file():
            evidence_files.append("Dockerfile")
            detected_platform = "docker"
            detected_language = "docker"
            confidence = max(confidence, 0.85)

        if detected_platform == "unknown" and (root / "index.html").is_file():
            evidence_files.append("index.html")
            detected_platform = "static"
            detected_language = "html"
            confidence = max(confidence, 0.8)

        if detected_platform == "unknown" and configured_platform:
            detected_platform = configured_platform
            confidence = max(confidence, 0.8)
            if detected_platform in {"nodejs", "react", "vue", "angular", "next"}:
                detected_language = "javascript"
            elif detected_platform in {"python", "django", "flask"}:
                detected_language = "python"

        # Fallback entrypoint if not set
        if not entrypoint and detected_platform == "nodejs":
            for candidate in ["server.js", "index.js", "app.js", "main.js"]:
                if (root / candidate).is_file():
                    entrypoint = candidate
                    break

        if not start_command and entrypoint:
            start_command = f"node {entrypoint}"

        if detected_platform == "unknown":
            missing_configs.append("Could not identify a Liara-supported platform from the project files.")

        # 4. Read .env.example or .env if present
        for env_file in [".env.example", ".env"]:
            env_path = root / env_file
            if env_path.is_file():
                if env_file not in evidence_files:
                    evidence_files.append(env_file)
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                var_name, _, value = line.partition("=")
                                var_name = var_name.strip()
                                if var_name:
                                    required_envs.add(var_name)
                                    env_evidence.setdefault(var_name, set()).add(env_file)
                                    if env_file == ".env.example":
                                        env_example_values[var_name] = value.strip().strip("\"'")
                except Exception:
                    pass

        # 5. Static scan of JS/TS entrypoints for process.env references
        for file_name in [entrypoint, "server.js", "index.js", "app.js"]:
            if not file_name:
                continue
            file_path = root / file_name
            if file_path.is_file():
                if file_name not in evidence_files:
                    evidence_files.append(file_name)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        matches = re.findall(
                            r"process\.env\.([A-Z0-9_]+)", content
                        )
                        for m in matches:
                            required_envs.add(m)
                            env_evidence.setdefault(m, set()).add(file_name)
                            escaped_name = re.escape(m)
                            optional_patterns = (
                                rf"process\.env\.{escaped_name}\s*(?:\|\||\?\?)",
                                rf"process\.env\.{escaped_name}\s*\?",
                                rf"if\s*\(\s*!?\s*process\.env\.{escaped_name}\s*\)",
                            )
                            if any(re.search(pattern, content) for pattern in optional_patterns):
                                optional_envs.add(m)
                except Exception:
                    pass

        # 6. Detect Databases
        detected_databases = self._detect_databases(
            root, pkg_data, requirements_text, required_envs, evidence_files
        )

        # Merge suggested env vars from detected databases into required_envs
        for db in detected_databases:
            for env_sugg in db.suggested_env_vars:
                required_envs.add(env_sugg)
                env_evidence.setdefault(env_sugg, set()).add(
                    db.evidence or "detected service dependency"
                )

        database_env_names = {
            env.upper()
            for db in detected_databases
            for env in db.suggested_env_vars
        }
        env_requirements = []
        for name in sorted(required_envs):
            upper_name = name.upper()
            if upper_name in PLATFORM_ENV_NAMES:
                value_source = "platform_provided"
            elif upper_name in database_env_names:
                value_source = "liara_service"
            elif EXTERNAL_CREDENTIAL_NAME.search(upper_name) or EXTERNAL_SERVICE_CREDENTIAL.search(upper_name):
                value_source = "external_credential"
            elif GENERATED_SECRET_NAME.search(upper_name):
                value_source = "generated_secret"
            else:
                value_source = "unresolved"

            env_requirements.append(
                EnvironmentVariableRequirement(
                    name=name,
                    evidence=sorted(env_evidence.get(name, set())),
                    required=value_source != "platform_provided" and name not in optional_envs,
                    sensitive=value_source in {
                        "external_credential",
                        "generated_secret",
                        "liara_service",
                    },
                    value_source=value_source,
                    example_is_placeholder=bool(
                        PLACEHOLDER_VALUE.search(env_example_values.get(name, ""))
                    ),
                )
            )

        persian_summary = self._generate_persian_summary(
            detected_platform, detected_databases, port
        )

        return ProjectAnalysis(
            detected_language=detected_language,
            detected_platform=detected_platform,
            confidence=confidence,
            entrypoint=entrypoint,
            start_command=start_command,
            port=port,
            evidence_files=sorted(list(set(evidence_files))),
            required_env_names=sorted(list(required_envs)),
            env_requirements=env_requirements,
            missing_configurations=missing_configs,
            detected_databases=detected_databases,
            persian_summary=persian_summary,
            has_liara_json=has_liara_json,
            existing_app_name=existing_app_name,
            suggested_app_name=suggested_app_name,
        )


project_inspector = ProjectInspector()
