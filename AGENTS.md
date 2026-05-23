# AGENTS.md

## Workflow
1. Read `@Specification.md` first.
2. Follow the requirements defined in `@Specification.md`.
3. If a user instruction conflicts with `@Specification.md`, do not continue the task.
4. Clearly explain the conflict to the user and ask for clarification or resolution.
5. After completing any change, increment the value in `build_number.txt` by 1.
  - Exception: when the version nunber changed, the build number is set to be 1. 
6. Update `@Specification_11.1_CHANGELOG.md` accordingly.
  - Update rule
    - Verion info is @Specification.md title part (ex: # KEMO EXPEDITION v0.6.3 - SPECIFICATION -> 0.6.3)
    - Build info is @build_number.txt
    - Entries must be sorted in descending order by Version, then Build.
    - descending order: Overall list order must remain Latest → Older. So insert the new entry at the top in the table
    - Insert new entries at the top of the table.
    - Date format: YYYY/MM/DD
    - Language: English
