# Baseline route coverage

Local synthetic fixtures; source revision a7b748ef21aecf79b537fe3179cc7bc8785267e7. Each listed route was opened at 390px and 1440px with controls inventoried and axe executed. This table proves page coverage; it does not alone prove every interaction.

| Route | Role | Widths | Axe rule findings |
| --- | --- | --- | --- |
| / | guest | 390, 1440 | color-contrast |
| /updates | guest | 390, 1440 | color-contrast |
| /parties | guest | 390, 1440 | None detected |
| /parties/qa-civic | guest | 390, 1440 | color-contrast |
| /iec | guest | 390, 1440 | None detected |
| /laws | guest | 390, 1440 | None detected |
| /laws/qa-law | guest | 390, 1440 | None detected |
| /surveys | guest | 390, 1440 | None detected |
| /surveys/qa-survey | guest | 390, 1440 | None detected |
| /hashtags/مشاركة | guest | 390, 1440 | None detected |
| /about-nashmi | guest | 390, 1440 | None detected |
| /chat | guest | 390, 1440 | None detected |
| /login | guest | 390, 1440 | None detected |
| /signup | guest | 390, 1440 | color-contrast |
| /register | guest | 390, 1440 | color-contrast |
| /forgot-password | guest | 390, 1440 | None detected |
| /reset-password | guest | 390, 1440 | None detected |
| /set-password | guest | 390, 1440 | None detected |
| /verify-email | guest | 390, 1440 | None detected |
| /users/6abdd291b66f598fa3e7107f | guest | 390, 1440 | None detected |
| /account | citizen | 390, 1440 | color-contrast, label |
| /party-dashboard | party | 390, 1440 | None detected |
| /party-dashboard/profile | party | 390, 1440 | label |
| /party-dashboard/posts | party | 390, 1440 | color-contrast, label |
| /party-dashboard/polls | party | 390, 1440 | color-contrast |
| /party-dashboard/surveys | party | 390, 1440 | button-name, color-contrast, select-name |
| /iec-dashboard | iec | 390, 1440 | None detected |
| /iec-dashboard/profile | iec | 390, 1440 | label |
| /iec-dashboard/posts | iec | 390, 1440 | color-contrast, label |
| /iec-dashboard/polls | iec | 390, 1440 | None detected |
| /iec-dashboard/surveys | iec | 390, 1440 | button-name, select-name |
| /iec-dashboard/laws | iec | 390, 1440 | label |
| /admin | super_admin | 390, 1440 | color-contrast |
| /admin/users | super_admin | 390, 1440 | select-name |
| /admin/parties | super_admin | 390, 1440 | color-contrast |
| /admin/laws | super_admin | 390, 1440 | color-contrast, label |
| /admin/surveys | super_admin | 390, 1440 | button-name, color-contrast, select-name |
| /admin/reports | super_admin | 390, 1440 | None detected |
| /admin/moderation | super_admin | 390, 1440 | color-contrast, select-name, aria-required-children |
| /admin/logs | super_admin | 390, 1440 | select-name |
| /admin/audit-logs | super_admin | 390, 1440 | select-name |
| /admin/news | super_admin | 390, 1440 | None detected |
| /admin/about-nashmi | super_admin | 390, 1440 | None detected |

Raw evidence: test-results/baseline/inventory.json. Test artifacts are ignored because they include session traces and machine-specific output. External SMTP, R2 and assistant provider persistence are outside this local coverage.
