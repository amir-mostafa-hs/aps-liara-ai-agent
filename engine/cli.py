import argparse
import asyncio
import os
import sys
from typing import List, Optional

from engine.config import settings
from engine.domain.models import ActionApprovalModel
from engine.services.deployer import deployment_executor
from engine.services.diagnoser import sre_diagnoser
from engine.services.inspector import project_inspector
from engine.services.planner import deployment_planner
from engine.services.verifier import endpoint_verifier


def print_banner():
    banner = """
===================================================================
   __   _                   ___                    _   
  / /  (_)__ _ _______ _   / _ | ___ ____ ___ ___ / /_ 
 / /__/ / _ `/ __/ _ `/  / __ |/ _ `/ -_) _ \\/ -_) __/ 
/____/_/\\_,_/_/  \\_,_/  /_/ |_|\\_, /\\__/_//_/\\__/\\__/  
                              /___/                    
       Liara Cloud Autonomous Deployment & SRE Agent CLI
===================================================================
"""
    print(banner)


def prompt_approval(prompt_text: str, auto_approve: bool = False) -> bool:
    if auto_approve:
        print(f"{prompt_text} [Auto-Approved --yes]")
        return True
    try:
        choice = input(f"{prompt_text} [y/N]: ").strip().lower()
        return choice in ("y", "yes")
    except (KeyboardInterrupt, EOFError):
        print("\nOperation cancelled by user.")
        return False


def run_inspect(path: str) -> int:
    print(f"\n[1/6] 🔍 Inspecting project at: {path}")
    analysis = project_inspector.inspect(path)
    print(f"  • Platform Detected : {analysis.detected_platform} (Language: {analysis.detected_language})")
    print(f"  • Target Port       : {analysis.port}")
    print(f"  • Entrypoint        : {analysis.entrypoint}")
    print(f"  • Evidence Files    : {', '.join(analysis.evidence_files)}")
    print(f"  • Required Env Vars : {', '.join(analysis.required_env_names) or 'None'}")
    return 0


async def run_full_pipeline(
    path: str,
    app_name: str,
    token: Optional[str] = None,
    auto_approve: bool = False,
    team_id: Optional[str] = None,
) -> int:
    api_token = token or os.getenv("LIARA_API_TOKEN") or ""
    active_team = team_id or os.getenv("LIARA_TEAM_ID") or None

    # Step 1: Inspect
    print(f"\n[1/6] 🔍 Inspecting project at: {path}")
    if active_team:
        print(f"  ✓ Liara Team ID     : {active_team}")
    analysis = project_inspector.inspect(path)
    print(f"  ✓ Platform detected: {analysis.detected_platform} on port {analysis.port}")
    print(f"  ✓ Evidence files: {', '.join(analysis.evidence_files)}")
    if analysis.required_env_names:
        print(f"  ✓ Detected required variables: {', '.join(analysis.required_env_names)}")

    # Step 2: Planning
    print(f"\n[2/6] 📋 Generating autonomous deployment plan for app: {app_name}...")
    plan = deployment_planner.generate_plan(analysis, app_name)
    print(f"  ✓ Impact Level   : {plan.impact_level.upper()}")
    print(f"  ✓ Plan Digest    : {plan.digest}")
    print("  ✓ Proposed Actions:")
    for action in plan.actions:
        print(f"      - [{action.operation.upper()}] target: {action.target} ({action.description})")

    # Step 3: Human Approval Gate
    print(f"\n[3/6] 🛡️ Operator Approval Gate")
    approved = prompt_approval("Do you approve this deployment plan to Liara Cloud?", auto_approve)
    if not approved:
        print("❌ Deployment cancelled by operator.")
        return 0

    # Step 4: Execute Deployment & Stream Logs
    print(f"\n[4/6] 🚀 Executing Liara deployment with live streaming & secret redaction...")
    deploy_logs: List[str] = []
    deploy_action = next(
        (a for a in plan.actions if a.operation == "deploy"),
        plan.actions[0] if plan.actions else None,
    )
    approval_model = ActionApprovalModel(
        run_id="cli-run",
        action_id=deploy_action.action_id if deploy_action else "deploy",
        operation=deploy_action.operation if deploy_action else "deploy",
        target=deploy_action.target if deploy_action else app_name,
        approved=True,
        plan_digest=plan.digest,
    )

    async for chunk in deployment_executor.execute_deployment(
        plan=plan,
        approval=approval_model,
        source_path=path,
        api_token=api_token,
        team_id=active_team,
    ):
        deploy_logs.append(chunk)
        print(f"  {chunk}", end="")
    print()

    all_logs = "".join(deploy_logs)

    # Step 5: Public Endpoint Verification & Health Decoupling
    print(f"\n[5/6] 🌐 Probing public endpoint: https://{app_name}.liara.run ...")
    verification = await endpoint_verifier.verify_endpoint(
        app_id=app_name,
        provider_status="success",
    )

    print(f"  • Provider Deployment Status : {verification.provider_status.upper()}")
    print(f"  • Application HTTP Health    : {verification.application_health.upper()}")
    if verification.http_status_code:
        print(f"  • HTTP Status Code           : {verification.http_status_code}")
    if verification.latency_ms:
        print(f"  • Latency                    : {verification.latency_ms} ms")

    if verification.application_health == "healthy":
        print("\n🎉 Deployment verified healthy! Application is serving live traffic.")
        return 0

    # Deliberate failure detected -> SRE loop
    print("\n⚠️ Application unhealthy / crashed on startup! Priming Autonomous SRE Loop...")

    # Step 6: SRE Diagnosis
    print(f"\n[6/6] 🛠️ Diagnosing crash logs with AI...")
    diagnosis = sre_diagnoser.diagnose_logs(
        logs=all_logs,
        app_id=app_name,
        provider_status=verification.provider_status,
    )

    print(f"  • Root Cause       : {diagnosis.root_cause}")
    print(f"  • Quoted Evidence  : {diagnosis.error_evidence}")
    if diagnosis.missing_variable:
        print(f"  • Missing Variable : {diagnosis.missing_variable}")

    if not diagnosis.remediation:
        print("❌ No automated remediation could be determined.")
        return 1

    rem = diagnosis.remediation
    print(f"\n  📋 Proposed Remediation:")
    print(f"      Operation : {rem.operation}")
    print(f"      Command   : liara env:set {rem.env_variable}=*** --app {rem.target}")
    print(f"      SHA-256   : {diagnosis.digest}")

    rem_approved = prompt_approval(
        f"Approve remediation to set '{rem.env_variable}' and restart container?",
        auto_approve,
    )
    if not rem_approved:
        print("❌ Remediation rejected by operator. Service remains degraded.")
        return 0

    print("\n  🚀 Executing remediation CLI and re-verifying public endpoint...")
    rem_approval = ActionApprovalModel(
        run_id="cli-run",
        action_id=rem.action_id,
        operation=rem.operation,
        target=rem.target,
        approved=True,
        plan_digest=diagnosis.digest,
    )

    rem_result = await sre_diagnoser.apply_remediation(
        remediation=rem,
        approval=rem_approval,
        api_token=api_token,
        team_id=active_team,
    )

    print(f"  • Remediation output: {rem_result.get('output', 'Applied')}")

    # Re-verify public health
    final_verification = await endpoint_verifier.verify_endpoint(
        app_id=app_name,
        provider_status="success",
    )

    print(f"  • Final HTTP Health : {final_verification.application_health.upper()} ({final_verification.http_status_code or 'N/A'})")

    if final_verification.application_health == "healthy":
        print("\n🎉 Service Successfully Recovered! Incident Closed.")
        print(f"🌐 Live application URL: https://{app_name}.liara.run")
        return 0
    else:
        print("\n❌ Remediation completed but application remains unhealthy.")
        return 1


def main(argv: Optional[List[str]] = None) -> int:
    if argv is None:
        argv = sys.argv[1:]

    parser = argparse.ArgumentParser(
        description="Liara Deployment & SRE Agent CLI Companion",
        prog="liara-agent",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: run (Default full pipeline)
    run_parser = subparsers.add_parser("run", help="Run full autonomous deployment & SRE workflow")
    run_parser.add_argument("--path", default="sample-apps/nodejs-demo", help="Path to project directory")
    run_parser.add_argument("--app", default="demo-node-app", help="Target Liara application name")
    run_parser.add_argument("--token", default=None, help="Liara API token (optional, defaults to env)")
    run_parser.add_argument("--team-id", default=None, help="Liara Team ID (optional, defaults to LIARA_TEAM_ID env)")
    run_parser.add_argument("-y", "--yes", action="store_true", help="Auto-approve prompts (non-interactive)")

    # Command: inspect
    inspect_parser = subparsers.add_parser("inspect", help="Statically inspect project code")
    inspect_parser.add_argument("--path", default="sample-apps/nodejs-demo", help="Path to project directory")

    args = parser.parse_args(argv)

    if not args.command:
        parser.print_help()
        return 0

    if args.command == "inspect":
        print_banner()
        return run_inspect(args.path)

    if args.command == "run":
        print_banner()
        return asyncio.run(
            run_full_pipeline(
                path=args.path,
                app_name=args.app,
                token=args.token,
                auto_approve=args.yes,
                team_id=args.team_id,
            )
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())

