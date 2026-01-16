{
  description = "OpenSpec - AI-native system for spec-driven development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];

      forAllSystems = f: nixpkgs.lib.genAttrs supportedSystems (system: f system);
    in
    {
      packages = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          default = pkgs.stdenv.mkDerivation (finalAttrs: {
            pname = "openspec";
            version = "0.20.0";

            src = ./.;

            pnpmDeps = pkgs.fetchPnpmDeps {
              inherit (finalAttrs) pname version src;
              pnpm = pkgs.pnpm_9;
              fetcherVersion = 3;
              hash = "sha256-m/7IdY1ou9ljjYAcx3W8AyEJvIZfCBWIWxproQ/INPA=";
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
        });

      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/openspec";
        };
      });

      devShells = forAllSystems (system:
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
        });
    };
}
