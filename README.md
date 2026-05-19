# workita-ai_workshop

AI workshop repository.

## Structure

```
workita-ai_workshop/
├── docs/           # Context documentation
├── openspec/       # OpenSpec spec-driven change management
│   ├── changes/    # Active and archived changes
│   └── specs/      # Canonical specifications
└── .claude/        # Claude Code commands and skills
    ├── commands/opsx/
    └── skills/
```

## OpenSpec Workflow

This repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven development.

| Command | Description |
|---|---|
| `/opsx:propose` | Start a new change with full artifact generation |
| `/opsx:apply` | Implement tasks from a change |
| `/opsx:explore` | Think through ideas before committing to a direction |
| `/opsx:archive` | Archive a completed change |
