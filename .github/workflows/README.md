# Github Workflows

## Testing CI Locally

Test GitHub Actions workflows locally using [act](https://nektosact.com/):

```bash
# Test all PR checks
act pull_request

# Test specific job
act pull_request -j nix-flake-validate

# Dry run to see what would execute
act pull_request --dryrun
```

The `.actrc` file configures act to use the appropriate Docker image.

## Signing the Windows executables

`binaries.yml` signs `openspec.exe` for each release through [SignPath Foundation](https://signpath.org), which signs open source projects for free. It is off until the repository has the four settings below; until then releases ship unsigned, as before.

One-time setup:

1. Apply at [signpath.org/apply](https://signpath.org/apply). The [code signing policy](../../docs-lab/start/installation.md#code-signing-policy) they ask for is already published.
2. In SignPath, link the project to the GitHub.com trusted build system and install the SignPath GitHub App on this repository.
3. Give the project this artifact configuration. It signs both files in the uploaded zip, and only if they name themselves OpenSpec at the version the workflow sends:

   ```xml
   <artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
     <parameters>
       <parameter name="version" required="true" />
     </parameters>
     <zip-file>
       <pe-file path="openspec-windows-x64.exe" product-name="OpenSpec" product-version="${version}">
         <authenticode-sign/>
       </pe-file>
       <pe-file path="openspec-windows-arm64.exe" product-name="OpenSpec" product-version="${version}">
         <authenticode-sign/>
       </pe-file>
     </zip-file>
   </artifact-configuration>
   ```

4. Add these under Settings → Secrets and variables → Actions:

   | Kind | Name | Value |
   |---|---|---|
   | Secret | `SIGNPATH_API_TOKEN` | API token of a SignPath user allowed to submit signing requests |
   | Variable | `SIGNPATH_ORGANIZATION_ID` | The SignPath organization ID; setting it switches signing on |
   | Variable | `SIGNPATH_PROJECT_SLUG` | The project's slug in SignPath |
   | Variable | `SIGNPATH_SIGNING_POLICY_SLUG` | The release signing policy's slug, usually `release-signing` |

Each release: publishing it starts the Binaries workflow, which sends a signing request and waits up to an hour. An approver approves it in SignPath, and the workflow then tests the signed files and attaches them. If nobody approves in time the run fails and nothing is attached; run the workflow again with the release's tag.
