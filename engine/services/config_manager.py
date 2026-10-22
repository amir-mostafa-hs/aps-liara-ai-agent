import difflib
import json
import os
from pathlib import Path

PLATFORM_CLI_MAP = {
    "nodejs": "node",
    "python": "python",
    "docker": "docker",
    "static": "static",
    "php": "php",
    "go": "go",
    "django": "django",
    "flask": "flask",
    "next": "next",
}


class ConfigManager:
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
            raise ValueError("Path cannot be empty.")

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

    def generate_diff(
        self,
        source_path: str,
        app_name: str,
        platform: str,
        port: int = 3000,
        env_vars: dict | None = None,
    ) -> dict:
        root = self.validate_path(source_path)
        cli_platform = PLATFORM_CLI_MAP.get(platform.lower(), platform.lower())

        files_diff: dict[str, dict] = {}

        # 1. Diff for liara.json
        liara_json_path = root / "liara.json"
        existing_liara_str = ""
        existing_data = {}
        if liara_json_path.is_file():
            try:
                existing_liara_str = liara_json_path.read_text(encoding="utf-8")
                existing_data = json.loads(existing_liara_str)
            except Exception:
                pass

        new_data = {
            **existing_data,
            "platform": cli_platform,
            "app": app_name.strip(),
            "port": port,
        }
        new_liara_str = json.dumps(new_data, indent=2, ensure_ascii=False) + "\n"

        liara_diff = list(
            difflib.unified_diff(
                existing_liara_str.splitlines(keepends=True),
                new_liara_str.splitlines(keepends=True),
                fromfile="a/liara.json" if existing_liara_str else "/dev/null",
                tofile="b/liara.json",
            )
        )
        files_diff["liara.json"] = {
            "exists": liara_json_path.is_file(),
            "diff": "".join(liara_diff),
            "new_content": new_liara_str,
        }

        # 2. Diff for .env (if env_vars provided)
        if env_vars:
            env_path = root / ".env"
            existing_env_str = ""
            existing_lines = []
            if env_path.is_file():
                try:
                    existing_env_str = env_path.read_text(encoding="utf-8")
                    existing_lines = existing_env_str.splitlines()
                except Exception:
                    pass

            new_lines = list(existing_lines)
            for k, v in env_vars.items():
                found = False
                for i, line in enumerate(new_lines):
                    if line.startswith(f"{k}=") or line.startswith(f"{k} ="):
                        new_lines[i] = f"{k}={v}"
                        found = True
                        break
                if not found:
                    new_lines.append(f"{k}={v}")

            new_env_str = "\n".join(new_lines) + "\n"

            env_diff = list(
                difflib.unified_diff(
                    existing_env_str.splitlines(keepends=True),
                    new_env_str.splitlines(keepends=True),
                    fromfile="a/.env" if existing_env_str else "/dev/null",
                    tofile="b/.env",
                )
            )
            files_diff[".env"] = {
                "exists": env_path.is_file(),
                "diff": "".join(env_diff),
                "new_content": new_env_str,
            }

        return {
            "ok": True,
            "source_path": str(root),
            "files": files_diff,
        }

    def apply_changes(
        self,
        source_path: str,
        apply_liara_json: bool,
        apply_local_env: bool,
        app_name: str,
        platform: str,
        port: int = 3000,
        env_vars: dict | None = None,
    ) -> dict:
        root = self.validate_path(source_path)
        diff_info = self.generate_diff(
            source_path=str(root),
            app_name=app_name,
            platform=platform,
            port=port,
            env_vars=env_vars,
        )

        modified_files = []

        if apply_liara_json and "liara.json" in diff_info["files"]:
            new_content = diff_info["files"]["liara.json"]["new_content"]
            (root / "liara.json").write_text(new_content, encoding="utf-8")
            modified_files.append("liara.json")

        if apply_local_env and ".env" in diff_info["files"]:
            new_content = diff_info["files"][".env"]["new_content"]
            (root / ".env").write_text(new_content, encoding="utf-8")
            modified_files.append(".env")

        return {
            "ok": True,
            "source_path": str(root),
            "modified_files": modified_files,
        }


config_manager = ConfigManager()
