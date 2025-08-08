# Vapor Documentation Structure

## Overview

The Vapor documentation is organized in a bilingual structure supporting English and Bahasa Indonesia. Each documentation file has a corresponding translation, and users can easily switch between languages.

## Directory Structure

```
docs/
├── README.md                 # Main entry point with language selection
├── STRUCTURE.md             # This file
├── en/                      # English documentation
│   ├── README.md           # English index
│   ├── 01-introduction.md
│   ├── 02-installation.md
│   ├── 03-first-login.md
│   ├── 04-user-interface.md
│   ├── 05-dashboard.md
│   ├── 06-network-management.md
│   ├── 07-storage-management.md
│   ├── 08-container-management.md
│   ├── 09-kubernetes-management.md
│   ├── 10-user-management.md
│   ├── 11-system-logs.md
│   ├── 12-terminal-access.md
│   ├── 13-api-reference.md
│   ├── 14-security.md
│   └── 15-troubleshooting.md
├── id/                      # Indonesian documentation
│   ├── README.md           # Indonesian index
│   ├── 01-pendahuluan.md
│   ├── 02-instalasi.md
│   ├── 03-login-pertama.md
│   ├── 04-antarmuka-pengguna.md
│   ├── 05-dashboard.md
│   ├── 06-manajemen-jaringan.md
│   ├── 07-manajemen-penyimpanan.md
│   ├── 08-manajemen-kontainer.md
│   ├── 09-manajemen-kubernetes.md
│   ├── 10-manajemen-pengguna.md
│   ├── 11-log-sistem.md
│   ├── 12-akses-terminal.md
│   ├── 13-referensi-api.md
│   ├── 14-keamanan.md
│   └── 15-pemecahan-masalah.md
└── assets/                  # Shared assets
    ├── screenshots/        # UI screenshots
    ├── diagrams/          # Architecture diagrams
    └── logos/             # Brand assets
```

## File Naming Convention

- English files: `##-topic-name.md` (e.g., `01-introduction.md`)
- Indonesian files: `##-nama-topik.md` (e.g., `01-pendahuluan.md`)
- Numbers ensure consistent ordering across languages

## Language Mapping

| English File | Indonesian File |
|-------------|-----------------|
| 01-introduction.md | 01-pendahuluan.md |
| 02-installation.md | 02-instalasi.md |
| 03-first-login.md | 03-login-pertama.md |
| 04-user-interface.md | 04-antarmuka-pengguna.md |
| 05-dashboard.md | 05-dashboard.md |
| 06-network-management.md | 06-manajemen-jaringan.md |
| 07-storage-management.md | 07-manajemen-penyimpanan.md |
| 08-container-management.md | 08-manajemen-kontainer.md |
| 09-kubernetes-management.md | 09-manajemen-kubernetes.md |
| 10-user-management.md | 10-manajemen-pengguna.md |
| 11-system-logs.md | 11-log-sistem.md |
| 12-terminal-access.md | 12-akses-terminal.md |
| 13-api-reference.md | 13-referensi-api.md |
| 14-security.md | 14-keamanan.md |
| 15-troubleshooting.md | 15-pemecahan-masalah.md |

## Documentation Features

### Language Toggle
Each page includes a language toggle at the top:
```markdown
<p align="center">
  <a href="../en/file.md">English</a> | <a href="../id/file.md">Bahasa Indonesia</a>
</p>
```

### Navigation
Each page has previous/next navigation at the bottom:
```markdown
[← Previous: Topic](prev-file.md) | [Next: Topic →](next-file.md)
```

### Consistent Structure
All documentation files follow this structure:
1. Title
2. Language toggle
3. Overview
4. Main content sections
5. Navigation links

## Content Status

### Completed Files (with full content):
- ✅ Main README files (en/id)
- ✅ 01 - Introduction/Pendahuluan
- ✅ 02 - Installation (English only)
- ✅ 03 - First Login (English only)
- ✅ 04 - User Interface (English only)
- ✅ 05 - Dashboard (English only)
- ✅ 09 - Kubernetes Management (English only)

### Template Files (need content):
- ⏳ All other files have basic templates ready for content

## Adding Content

To add content to template files:
1. Open the file in the appropriate language directory
2. Replace placeholder content with actual documentation
3. Add screenshots/diagrams to the assets directory
4. Update cross-references and links
5. Ensure language toggle links are correct

## Screenshot Naming Convention

Store screenshots in `/docs/assets/screenshots/` with descriptive names:
- `auth_login_form_empty_dark.png`
- `dashboard_main_view_dark.png`
- `network_interfaces_list_dark.png`
- etc.

## Translation Guidelines

When translating:
1. Maintain the same structure as the English version
2. Use consistent terminology throughout
3. Keep code examples unchanged
4. Adapt cultural references appropriately
5. Ensure all links work correctly

## Quality Checklist

Before publishing, ensure:
- [ ] All language toggle links work
- [ ] Navigation links are correct
- [ ] Screenshots are properly referenced
- [ ] Code examples are tested
- [ ] Both language versions are synchronized
- [ ] No broken links
- [ ] Consistent formatting
