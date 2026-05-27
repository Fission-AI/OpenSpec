## 1. Create Update Script

- [x] 1.1 Create scripts/update-flake.sh file
- [x] 1.2 Add shebang and error handling (set -euo pipefail)
- [x] 1.3 Add path resolution for project root and files
- [x] 1.4 Make script executable (chmod +x)

## 2. Implement Version Update Logic

- [x] 2.1 Extract version from package.json using Node.js
- [x] 2.2 Use sed to update version in flake.nix
- [x] 2.3 Report if version already up-to-date
- [x] 2.4 Display detected version to user

## 3. Implement Hash Update Logic

- [x] 3.1 Set placeholder hash in flake.nix
- [x] 3.2 Run nix build and capture output (allow failure)
- [x] 3.3 Extract correct hash from build error using grep
- [x] 3.4 Handle case where hash extraction fails
- [x] 3.5 Update flake.nix with correct hash
- [x] 3.6 Display detected hash to user

## 4. Add Build Verification

- [x] 4.1 Run nix build after hash update
- [x] 4.2 Check for dirty git tree warning
- [x] 4.3 Report success or failure clearly

## 5. Add User Feedback

- [x] 5.1 Add progress messages for each step
- [x] 5.2 Add success summary with version and hash
- [x] 5.3 Add next steps instructions (test, commit)
- [x] 5.4 Add error messages with context

## 6. Create Documentation

- [x] 6.1 Create scripts/README.md
- [x] 6.2 Document update-flake.sh purpose and usage
- [x] 6.3 Add example workflow
- [x] 6.4 Document other existing scripts

## 7. Testing

- [x] 7.1 Test script runs successfully
- [x] 7.2 Verify version is extracted correctly
- [x] 7.3 Verify hash is updated correctly
- [x] 7.4 Verify build succeeds after update
- [x] 7.5 Test idempotency (running twice works)

## 8. Integration

- [ ] 8.1 Add note to release process documentation
- [ ] 8.2 Use in next actual version bump to validate workflow
