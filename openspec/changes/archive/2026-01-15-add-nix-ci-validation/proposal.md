# Add Nix CI Validation

## Why

The project recently added Nix flake support (flake.nix) and an automated update script (scripts/update-flake.sh) to enable Nix users to install OpenSpec. However, there is no CI validation ensuring these Nix artifacts continue to work as the project evolves. This creates risk that breaking changes could be merged without detection.

## What Changes

- Add a new GitHub Actions workflow job to validate Nix flake builds successfully
- Add validation that the update-flake.sh script executes without errors
- Test on Linux (where Nix support is most common)
- Ensure CI fails if Nix build or update script breaks
- Enable local testing with `act` for developers

## Impact

- Affected specs: New capability `ci-nix-validation`
- Affected code: `.github/workflows/ci.yml` (add new job)
- Affected infrastructure: GitHub Actions runners with Nix installed
- Benefits: Prevents regressions in Nix support, gives confidence to Nix users
- Trade-offs: Adds ~2-3 minutes to CI runtime
