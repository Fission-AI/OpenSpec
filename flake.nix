{
  description = "OpenSpec - AI-native system for spec-driven development";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_22;
        packageJson = pkgs.lib.importJSON ./package.json;
      in
      {
        packages.default = pkgs.stdenv.mkDerivation (finalAttrs: {
          pname = "openspec";
          version = packageJson.version;

          src = ./.;

          nativeBuildInputs = [
            nodejs
            pkgs.pnpm
            pkgs.pnpmConfigHook
            pkgs.makeWrapper
          ];

          # When pnpm-lock.yaml changes, update hash by running:
          # nix build 2>&1 | grep 'got:' | awk '{print $2}'
          pnpmDeps = pkgs.fetchPnpmDeps {
            inherit (finalAttrs) pname version src;
            hash = "sha256-vAlqVFaBN7KMlyP4HKbsMkaYrA5Yf2l5a+PLCZ6KOzs=";
            fetcherVersion = 3;
          };

          buildPhase = ''
            runHook preBuild
            pnpm run build
            runHook postBuild
          '';

          installPhase = ''
            runHook preInstall

            mkdir -p $out/lib/openspec
            cp -r dist $out/lib/openspec/
            cp -r bin $out/lib/openspec/
            cp -r node_modules $out/lib/openspec/
            cp package.json $out/lib/openspec/

            mkdir -p $out/bin
            makeWrapper ${nodejs}/bin/node $out/bin/openspec \
              --add-flags "$out/lib/openspec/bin/openspec.js"

            runHook postInstall
          '';

          meta = with pkgs.lib; {
            description = "AI-native system for spec-driven development";
            homepage = "https://github.com/Fission-AI/OpenSpec";
            license = licenses.mit;
            maintainers = [ ];
            mainProgram = "openspec";
            platforms = platforms.all;
          };
        });

        devShells.default = pkgs.mkShell {
          buildInputs = [
            nodejs
            pkgs.pnpm
          ];
        };

        apps.default = flake-utils.lib.mkApp {
          drv = self.packages.${system}.default;
        };
      }
    );
}
