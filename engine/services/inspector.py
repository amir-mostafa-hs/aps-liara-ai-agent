import json
import os
import re
from pathlib import Path
from engine.domain.models import ProjectAnalysis


class ProjectInspector:
    def __init__(self, allowed_roots: list[str] | None = None):
        if allowed_roots is None:
            # By default allow the repo root and its subdirectories
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

        # Check path traversal / boundary
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

    def inspect(self, raw_path: str) -> ProjectAnalysis:
        root = self.validate_path(raw_path)

        evidence_files: list[str] = []
        required_envs: set[str] = set()
        missing_configs: list[str] = []

        detected_platform = "unknown"
        detected_language = "unknown"
        confidence = 0.0
        start_command = None
        entrypoint = None
        port = 3000

        # 1. Check liara.json if present
        liara_json_path = root / "liara.json"
        if liara_json_path.is_file():
            evidence_files.append("liara.json")
            try:
                with open(liara_json_path, "r", encoding="utf-8") as f:
                    liara_data = json.load(f)
                    if "port" in liara_data:
                        port = int(liara_data["port"])
                    if "platform" in liara_data:
                        detected_platform = liara_data["platform"]
                        if detected_platform == "node":
                            detected_platform = "nodejs"
                            detected_language = "javascript"
                            confidence = 0.95
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
            except Exception:
                missing_configs.append("Malformed package.json file.")

        # Fallback entrypoint if not set
        if not entrypoint:
            for candidate in ["server.js", "index.js", "app.js", "main.js"]:
                if (root / candidate).is_file():
                    entrypoint = candidate
                    break

        if not start_command and entrypoint:
            start_command = f"node {entrypoint}"

        # 3. Read .env.example if present
        env_example_path = root / ".env.example"
        if env_example_path.is_file():
            evidence_files.append(".env.example")
            try:
                with open(env_example_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            var_name = line.split("=")[0].strip()
                            if var_name:
                                required_envs.add(var_name)
            except Exception:
                pass

        # 4. Static scan of JS/TS entrypoints for process.env references
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
                except Exception:
                    pass

        return ProjectAnalysis(
            detected_language=detected_language,
            detected_platform=detected_platform,
            confidence=confidence,
            entrypoint=entrypoint,
            start_command=start_command,
            port=port,
            evidence_files=sorted(list(set(evidence_files))),
            required_env_names=sorted(list(required_envs)),
            missing_configurations=missing_configs,
        )


project_inspector = ProjectInspector()

