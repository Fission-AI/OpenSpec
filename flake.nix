{
  description = "OpenSpec - AI-native system for spec-driven development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f system);
    in
    {
      packages = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          inherit (pkgs) lib;
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "openspec";
            version = (builtins.fromJSON (builtins.readFile ./package.json)).version;

            src = lib.fileset.toSource {
              root = ./.;
              fileset = lib.fileset.unions [
                ./src
                ./bin
                ./schemas
                ./scripts
                ./test
                ./package.json
                ./pnpm-lock.yaml
                ./tsconfig.json
                ./build.js
                ./vitest.config.ts
                ./vitest.setup.ts
                ./eslint.config.js
              ];
            };

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              pnpm = pkgs.pnpm_9;
              fetcherVersion = 3;
              hash = "sha256-9s2kdvd7svK4hofnD66HkDc86WTQeayfF5y7L2dmjNg=";
            };

            nativeBuildInputs = with pkgs; [
              nodejs_20
              npmHooks.npmInstallHook
              pnpmConfigHook
              pnpm_9
            ];

            buildPhase = ''
              runHook preBuild

              pnpm run build

              runHook postBuild
            '';

            dontNpmPrune = true;

            meta = with pkgs.lib; {
              description = "AI-native system for spec-driven development";
              homepage = "https://github.com/Fission-AI/OpenSpec";
              license = licenses.mit;
              maintainers = [ ];
              mainProgram = "openspec";
            };
          });
        }
      );

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/openspec";
        };
      });

      devShells = forAllSystems (
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs_20
              pnpm_9
            ];

            shellHook = ''
              echo "OpenSpec development environment"
              echo "Node version: $(node --version)"
              echo "pnpm version: $(pnpm --version)"
              echo "Run 'pnpm install' to install dependencies"
            '';
          };
        }
      );
    };
}
