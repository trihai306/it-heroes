"""Team Presets — predefined team configurations mapped to SDK AgentDefinitions.

Each preset defines:
- lead_prompt: System prompt for the lead agent
- agents: dict of AgentDefinition objects for SDK subagents
- db_agents: list of Agent DB record templates (lead + teammates)
"""

TEAM_PRESETS = {
    "fullstack": {
        "name": "Full Stack Team",
        "description": "Lead + Backend + Frontend + QA for full development cycle",
        "icon": "🚀",
        "lead_prompt": (
            "You are the lead architect coordinating a full-stack team. "
            "You have 3 teammates available as subagents:\n"
            "- backend_dev: Backend specialist for APIs, data models, server logic\n"
            "- frontend_dev: Frontend specialist for UI, UX, components\n"
            "- qa_engineer: QA specialist for tests, linting, validation\n\n"
            "Break down the task into subtasks and delegate to your teammates using the Task tool. "
            "Review their work and ensure code quality. Synthesize results when all teammates finish."
        ),
        "agents": {
            "backend_dev": {
                "description": "Backend specialist for API design, data models, and server logic",
                "prompt": (
                    "You are a Backend Developer. Implement server-side logic, APIs, "
                    "database models, and business logic. Write clean, tested, "
                    "production-quality code."
                ),
                "tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"],
                "model": "sonnet",
            },
            "frontend_dev": {
                "description": "Frontend specialist for UI components, UX, and responsive design",
                "prompt": (
                    "You are a Frontend Developer. Implement UI components, styling, "
                    "user interactions, and client-side logic. Follow modern best practices."
                ),
                "tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"],
                "model": "sonnet",
            },
            "qa_engineer": {
                "description": "QA engineer for testing, verification, and quality assurance",
                "prompt": (
                    "You are a QA Engineer. Review code for bugs, write tests, run linters, "
                    "and validate that implementations meet requirements."
                ),
                "tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"],
                "model": "sonnet",
            },
        },
        "db_agents": [
            {"name": "Lead Agent", "role": "lead", "is_lead": True, "avatar_key": "lead", "sdk_agent_key": None},
            {"name": "Backend Dev", "role": "backend", "is_lead": False, "avatar_key": "backend", "sdk_agent_key": "backend_dev"},
            {"name": "Frontend Dev", "role": "frontend", "is_lead": False, "avatar_key": "frontend", "sdk_agent_key": "frontend_dev"},
            {"name": "QA Engineer", "role": "qa", "is_lead": False, "avatar_key": "qa", "sdk_agent_key": "qa_engineer"},
        ],
    },
    "research": {
        "name": "Research Team",
        "description": "Multiple reviewers investigating from different angles",
        "icon": "🔬",
        "lead_prompt": (
            "You are the lead researcher coordinating a research team. "
            "You have 3 teammates:\n"
            "- security_auditor: Focuses on security vulnerabilities and best practices\n"
            "- perf_analyst: Analyzes performance bottlenecks and optimization\n"
            "- doc_writer: Documents architecture, APIs, and developer guides\n\n"
            "Delegate investigation tasks to teammates. Synthesize findings into a cohesive report."
        ),
        "agents": {
            "security_auditor": {
                "description": "Security engineer reviewing code for vulnerabilities",
                "prompt": (
                    "You are a Security Engineer. Focus on security vulnerabilities, "
                    "dependency risks, and best practices. Report findings with severity ratings."
                ),
                "tools": ["Bash", "Read", "Glob", "Grep"],
                "model": "sonnet",
            },
            "perf_analyst": {
                "description": "Performance analyst identifying bottlenecks and optimizations",
                "prompt": (
                    "You are a Performance Analyst. Analyze performance bottlenecks, "
                    "optimization opportunities, and resource usage patterns."
                ),
                "tools": ["Bash", "Read", "Glob", "Grep"],
                "model": "sonnet",
            },
            "doc_writer": {
                "description": "Documentation writer for architecture and API docs",
                "prompt": (
                    "You are a Documentation Writer. Create and update documentation, "
                    "README files, API docs, and inline code comments."
                ),
                "tools": ["Bash", "Read", "Write", "Edit", "Glob", "Grep"],
                "model": "sonnet",
            },
        },
        "db_agents": [
            {"name": "Lead Researcher", "role": "lead", "is_lead": True, "avatar_key": "lead", "sdk_agent_key": None},
            {"name": "Security Auditor", "role": "security", "is_lead": False, "avatar_key": "security", "sdk_agent_key": "security_auditor"},
            {"name": "Performance Analyst", "role": "backend", "is_lead": False, "avatar_key": "backend", "sdk_agent_key": "perf_analyst"},
            {"name": "Documentation Writer", "role": "docs", "is_lead": False, "avatar_key": "docs", "sdk_agent_key": "doc_writer"},
        ],
    },
    "review": {
        "name": "Code Review Team",
        "description": "Parallel reviewers checking security, performance, and tests",
        "icon": "🔍",
        "lead_prompt": (
            "You are the review lead coordinating parallel code reviews. "
            "You have 2 teammates:\n"
            "- security_reviewer: Reviews code for security vulnerabilities\n"
            "- quality_reviewer: Checks test coverage, edge cases, code quality\n\n"
            "Assign review areas to each teammate. Synthesize findings into a final review summary."
        ),
        "agents": {
            "security_reviewer": {
                "description": "Security reviewer checking for vulnerabilities and injection risks",
                "prompt": (
                    "You are a Security Reviewer. Review code for security vulnerabilities, "
                    "injection risks, authentication issues, and data exposure."
                ),
                "tools": ["Read", "Glob", "Grep"],
                "model": "sonnet",
            },
            "quality_reviewer": {
                "description": "Quality reviewer checking test coverage and code standards",
                "prompt": (
                    "You are a Quality Reviewer. Check test coverage, edge cases, "
                    "code quality standards, and adherence to best practices."
                ),
                "tools": ["Bash", "Read", "Glob", "Grep"],
                "model": "sonnet",
            },
        },
        "db_agents": [
            {"name": "Review Lead", "role": "lead", "is_lead": True, "avatar_key": "lead", "sdk_agent_key": None},
            {"name": "Security Reviewer", "role": "security", "is_lead": False, "avatar_key": "security", "sdk_agent_key": "security_reviewer"},
            {"name": "Quality Reviewer", "role": "qa", "is_lead": False, "avatar_key": "qa", "sdk_agent_key": "quality_reviewer"},
        ],
    },
    "debug": {
        "name": "Debug Squad",
        "description": "Competing hypotheses — multiple agents investigate in parallel",
        "icon": "🐛",
        "lead_prompt": (
            "You are the debug lead coordinating a parallel investigation. "
            "You have 3 teammates, each testing a different hypothesis:\n"
            "- hypothesis_backend: Investigates from a backend/data perspective\n"
            "- hypothesis_frontend: Investigates from a frontend/UI perspective\n"
            "- hypothesis_qa: Investigates from a testing/reproduction perspective\n\n"
            "Have each teammate investigate their theory. Compare findings and converge on the root cause."
        ),
        "agents": {
            "hypothesis_backend": {
                "description": "Backend investigator testing backend/data hypotheses",
                "prompt": (
                    "You are investigating a bug from a backend/data perspective. "
                    "Test your theory, examine logs, trace data flow, and report findings."
                ),
                "tools": ["Bash", "Read", "Glob", "Grep"],
                "model": "sonnet",
            },
            "hypothesis_frontend": {
                "description": "Frontend investigator testing UI/client hypotheses",
                "prompt": (
                    "You are investigating a bug from a frontend/UI perspective. "
                    "Test your theory, check rendering, trace user interactions, and report findings."
                ),
                "tools": ["Bash", "Read", "Glob", "Grep"],
                "model": "sonnet",
            },
            "hypothesis_qa": {
                "description": "QA investigator reproducing and isolating the issue",
                "prompt": (
                    "You are investigating a bug from a testing perspective. "
                    "Try to reproduce the issue, isolate the minimal case, and report findings."
                ),
                "tools": ["Bash", "Read", "Glob", "Grep"],
                "model": "sonnet",
            },
        },
        "db_agents": [
            {"name": "Debug Lead", "role": "lead", "is_lead": True, "avatar_key": "lead", "sdk_agent_key": None},
            {"name": "Hypothesis A", "role": "backend", "is_lead": False, "avatar_key": "backend", "sdk_agent_key": "hypothesis_backend"},
            {"name": "Hypothesis B", "role": "frontend", "is_lead": False, "avatar_key": "frontend", "sdk_agent_key": "hypothesis_frontend"},
            {"name": "Hypothesis C", "role": "qa", "is_lead": False, "avatar_key": "qa", "sdk_agent_key": "hypothesis_qa"},
        ],
    },
}


def get_preset_ids() -> list[str]:
    """Return list of available preset IDs."""
    return list(TEAM_PRESETS.keys())


def get_preset_summary() -> list[dict]:
    """Return summary of all presets for the frontend."""
    return [
        {
            "id": pid,
            "name": preset["name"],
            "description": preset["description"],
            "icon": preset["icon"],
            "agent_count": len(preset["db_agents"]),
            "agents": [
                {"name": a["name"], "role": a["role"], "is_lead": a["is_lead"]}
                for a in preset["db_agents"]
            ],
        }
        for pid, preset in TEAM_PRESETS.items()
    ]


# ─── Prompt Translation (Preset → Natural Language for CLI Agent Teams) ───


def build_team_creation_prompt(preset_id: str, project_context: str = "", team_name: str = "") -> str:
    """Convert a preset into a natural language prompt that tells Claude CLI
    to create an agent team with specific teammates.

    This is the bridge between our preset system and real CLI Agent Teams.
    """
    preset = TEAM_PRESETS.get(preset_id)
    if not preset:
        raise ValueError(f"Unknown preset: {preset_id}")

    # Build teammate descriptions from the preset
    teammate_lines = []
    for key, agent_cfg in preset["agents"].items():
        db_agent = next(
            (a for a in preset["db_agents"] if a.get("sdk_agent_key") == key),
            None,
        )
        name = db_agent["name"].lower().replace(" ", "-") if db_agent else key
        role_desc = agent_cfg["description"]
        teammate_lines.append(f"- **{name}**: {role_desc}")

    teammates_block = "\n".join(teammate_lines)
    num_teammates = len(preset["agents"])

    team_name_str = team_name or f"{preset_id}-team"
    prompt = (
        f"Create an agent team called \"{team_name_str}\" with {num_teammates} teammates.\n\n"
        f"{preset['lead_prompt']}\n\n"
        f"Create these specific teammates:\n"
        f"{teammates_block}\n\n"
    )
    if project_context:
        prompt += f"Project context: {project_context}\n\n"
    prompt += (
        "After creating the team, wait for my instructions. "
        "Do NOT start working on any tasks yet — "
        "just confirm the team is ready and list each teammate's name and role."
    )
    return prompt


def build_custom_team_prompt(user_prompt: str, team_name: str = "custom-team") -> str:
    """Wrap a user's custom prompt with team creation instructions."""
    return (
        f"Analyze the following request and create an appropriate agent team to accomplish it.\n"
        f"Choose the right number of teammates (1-5) based on task complexity.\n"
        f"For each teammate, pick a descriptive name, give them a focused role, "
        f"and provide a clear prompt describing their responsibilities.\n\n"
        f"The request:\n{user_prompt}\n\n"
        f"After creating the team, coordinate the work among your teammates. "
        f"Delegate tasks as appropriate and synthesize results when everyone finishes."
    )
