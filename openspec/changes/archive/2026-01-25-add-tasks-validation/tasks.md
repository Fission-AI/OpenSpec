# Tasks: Add tasks.md Validation

## 1. Add Validation Method to Validator Class

- [x] 1.1 Add `validateTasksFile(changeDir: string): Promise<ValidationReport>` method to Validator class
- [x] 1.2 Implement file existence check (ERROR if missing)
- [x] 1.3 Add `validateTasksContent(content: string): ValidationIssue[]` private method
- [x] 1.4 Implement checkbox task detection using pattern `/^[-*]\s+\[[xX\s]\]/`
- [x] 1.5 Check for at least one checkboxed task (ERROR if none found)
- [x] 1.6 Detect empty task descriptions with pattern `/^[-*]\s+\[[xX\s]\]\s*$/` (ERROR)
- [x] 1.7 Include line numbers in error messages for empty tasks

## 2. Integrate with Validate Command

- [x] 2.1 Update `validateDirectItem()` in ValidateCommand to call tasks.md validation for changes
- [x] 2.2 Update `validateByType()` to include tasks.md validation when type is 'change'
- [x] 2.3 Update `runBulkValidation()` to validate tasks.md for each change
- [x] 2.4 Ensure tasks.md validation results are displayed alongside proposal.md and spec results

## 3. Testing

- [x] 3.1 Add unit tests for `validateTasksContent()` with various checkbox formats
- [x] 3.2 Test error case: tasks.md file missing
- [x] 3.3 Test error case: no checkboxed tasks found
- [x] 3.4 Test error case: empty task descriptions
- [x] 3.5 Test valid case: properly formatted tasks.md with multiple tasks
- [x] 3.6 Test pattern compatibility with existing task-progress.ts regex
- [x] 3.7 Add integration test for `openspec validate <change>` including tasks.md

## 4. Documentation

- [x] 4.1 Update error messages to be clear and actionable
- [x] 4.2 Ensure validation output shows tasks.md status alongside other files
