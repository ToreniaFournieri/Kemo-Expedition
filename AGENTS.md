# AGENTS.md

## Workflow rules

1. After completing a runtime change, increment the value in `build_number.txt` by 1.
   * Exception: when the version number changes, reset the build number to `1`.
2. Update `Specification_11.1_CHANGELOG.md` accordingly.
   * Rules:
     * Obtain the version number from the title of `Specification.md`.
       * Example: `# KEMO EXPEDITION v0.6.3 - SPECIFICATION` → `0.6.3`
     * Obtain the build number from `build_number.txt`.
     * Entries must be sorted in descending order by Version, then Build.
     * The overall order must remain Latest → Older.
     * Insert each new entry at the top of the table.
     * Date format: `YYYY/MM/DD`
     * Language: English

## Change tiers

* **Documentation-only change**
  * Do not update the build number or changelog.
* **Micro runtime change**
  * Inspect only the named specification section and affected files.
  * Run focused tests.
  * Update the build number and changelog.

* **Release or cross-system change**
  * Perform full propagation and full validation.
  * Update the build number and changelog as required.

## File ownership

* `Specification_X.X_*.md`: Human-owned.
* Exception:
  * `Specification_9.1.4_API_DETAIL.md`: AI-owned and must follow `Specification_9.1.3_API.md`.
