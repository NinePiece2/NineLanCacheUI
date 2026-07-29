## 🎉 Release [VERSION]

**Release Date:** [DATE]

### 📋 Summary
<!-- Provide a brief overview of this release -->

### ✨ New Features
<!-- List new features added in this release -->

- 

### 🐛 Bug Fixes
<!-- List bugs that were fixed -->

- 

### 🔧 Improvements
<!-- List enhancements and improvements -->

- 

### ⚠️ Breaking Changes
<!-- List any breaking changes that require user action -->

- None

### 🔄 Changes
<!-- List other notable changes -->

- 

### 📦 Docker Images

**UI Image:**
```bash
docker pull ninepiece2/nine-lancache-ui:ui-[VERSION]
docker pull ninepiece2/nine-lancache-ui:ui  # latest
```

**API Image:**
```bash
docker pull ninepiece2/nine-lancache-ui:api-[VERSION]
docker pull ninepiece2/nine-lancache-ui:api  # latest
```

### 📝 Configuration Changes
<!-- Note any changes to configuration or environment variables -->

No configuration changes required.

<!-- If there are changes, list them:
**New Environment Variables:**
- `VARIABLE_NAME` - Description

**Modified Environment Variables:**
- `VARIABLE_NAME` - What changed

**Deprecated:**
- `OLD_VARIABLE` - Use `NEW_VARIABLE` instead
-->

### 🔄 Migration Guide
<!-- Provide migration instructions if needed -->

No migration steps required. Simply pull the latest images and restart your containers:

```bash
docker compose pull
docker compose down
docker compose up -d
```

<!-- If migration is needed, provide detailed steps:
1. Backup your data directory
2. Stop containers: `docker compose down`
3. Update docker-compose.yml with new configuration
4. Pull new images: `docker compose pull`
5. Start containers: `docker compose up -d`
-->

### 📚 Documentation
<!-- Link to updated documentation -->

- [README](https://github.com/NinePiece2/NineLanCacheUI/blob/main/README.md)
- [Contributing Guidelines](https://github.com/NinePiece2/NineLanCacheUI/blob/main/CONTRIBUTING.md)

### 🙏 Contributors
<!-- Thank contributors to this release -->

Thank you to all contributors who helped with this release!

<!-- Use GitHub's auto-generated contributor list or manually list:
- @username1
- @username2
-->

### 📊 Statistics
<!-- Optional: Add some stats about the release -->

- **Commits:** X
- **Files Changed:** X
- **Contributors:** X

### 🔗 Full Changelog

**Full Changelog**: https://github.com/NinePiece2/NineLanCacheUI/compare/[PREVIOUS_VERSION]...[VERSION]

---

### 💬 Feedback

If you encounter any issues or have suggestions, please:
- 🐛 [Report a bug](https://github.com/NinePiece2/NineLanCacheUI/issues/new?template=bug_report.md)
- ✨ [Request a feature](https://github.com/NinePiece2/NineLanCacheUI/issues/new?template=feature_request.md)
- 💬 [Ask a question](https://github.com/NinePiece2/NineLanCacheUI/issues/new?template=question.md)

### ⭐ Support

If you find this project helpful, please consider:
- Starring the repository ⭐
- Sponsoring the project via [GitHub Sponsors](https://github.com/sponsors/NinePiece2)
- Contributing to the codebase
