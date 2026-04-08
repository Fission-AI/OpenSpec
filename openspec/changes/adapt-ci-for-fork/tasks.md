## 1. Remove release-prepare workflow

- [x] 1.1 Delete `.github/workflows/release-prepare.yml`

## 2. Strip Nix jobs from ci.yml

- [x] 2.1 Remove the `changes` job (path-filter detection) from `ci.yml`
- [x] 2.2 Remove the `nix-flake-validate` job from `ci.yml`

## 3. Clean up required-checks jobs

- [x] 3.1 Update `required-checks-pr`: remove `nix-flake-validate` from the `needs` array
- [x] 3.2 Update `required-checks-pr`: remove the Nix result check from the inline script
- [x] 3.3 Update `required-checks-main`: remove `nix-flake-validate` from the `needs` array
- [x] 3.4 Update `required-checks-main`: remove the Nix result check from the inline script

## 4. Verify

- [x] 4.1 Confirm `ci.yml` contains no references to `nix`, `flake`, or `changes` job
- [x] 4.2 Confirm `release-prepare.yml` no longer exists in `.github/workflows/`
- [ ] 4.3 Open a test PR and confirm CI runs successfully with only the expected jobs
