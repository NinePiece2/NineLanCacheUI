# Contributing to NineLanCacheUI

Thank you for your interest in contributing to NineLanCacheUI! We welcome contributions from the community to help improve this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Development Setup](#development-setup)
- [Style Guidelines](#style-guidelines)
  - [Git Commit Messages](#git-commit-messages)
  - [Code Style](#code-style)
- [Testing](#testing)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (configuration files, log outputs, screenshots)
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (OS, Docker version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the suggested enhancement
- **Explain why this enhancement would be useful** to most users
- **Include examples or mockups** if applicable

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following our code style guidelines
3. **Test your changes thoroughly**
4. **Update documentation** if needed (README, inline comments, etc.)
5. **Write clear commit messages** following our guidelines
6. **Submit a pull request** with a clear description of the changes

#### Pull Request Process

- Ensure any install or build dependencies are removed before the end of the layer when doing a build
- Update the README.md with details of changes to the interface, including new environment variables, exposed ports, useful file locations, and container parameters
- The PR will be merged once you have the sign-off of the project maintainers

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ and npm (for UI development)
- .NET 9 SDK (for API development)
- A LanCache instance for testing (or access to sample log files)

### API Development Setup

```bash
cd NineLanCacheUI-API/NineLanCacheUI-API
dotnet restore
dotnet run
```

The API will be available at `http://localhost:7401`

### UI Development Setup

```bash
cd NineLanCacheUI
npm install
npm run dev
```

The UI will be available at `http://localhost:3000`

### Running with Docker Compose

```bash
docker compose up -d
```

Access the application at `http://localhost:8080`

## Style Guidelines

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line
- Consider starting the commit message with an applicable emoji:
  - 🎨 `:art:` when improving the format/structure of the code
  - 🐛 `:bug:` when fixing a bug
  - ✨ `:sparkles:` when adding a new feature
  - 📝 `:memo:` when writing docs
  - 🚀 `:rocket:` when improving performance
  - ✅ `:white_check_mark:` when adding tests
  - 🔒 `:lock:` when dealing with security

### Code Style

#### TypeScript/JavaScript (UI)

- Follow the existing ESLint configuration
- Use TypeScript for type safety
- Prefer functional components and hooks in React
- Use meaningful variable and function names

#### C# (.NET API)

- Follow standard C# naming conventions (PascalCase for public members, camelCase for private)
- Use async/await for asynchronous operations
- Add XML documentation comments for public APIs
- Keep controllers thin, move business logic to services

#### Docker

- Use multi-stage builds where appropriate
- Minimize layer count and image size
- Don't run containers as root when possible
- Document all environment variables

## Testing

- Write tests for new features and bug fixes
- Ensure all tests pass before submitting a PR
- Include both unit tests and integration tests where appropriate
- Test Docker builds locally before pushing

For API testing:
```bash
cd NineLanCacheUI-API/NineLanCacheUI-API
dotnet test
```

For UI testing:
```bash
cd NineLanCacheUI
npm test
```

## Community

- Join discussions in GitHub Issues and Pull Requests
- Be respectful and constructive in all interactions
- Help others when you can
- Share your use cases and ideas

## Questions?

If you have questions about contributing, feel free to:
- Open an issue with the "question" label
- Check existing issues and discussions
- Review the README for project-specific information

Thank you for contributing to NineLanCacheUI! 🎉
