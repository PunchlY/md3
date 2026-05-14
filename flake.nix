{
  description = "Bun2Nix minimal sample";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    systems.url = "github:nix-systems/default";

    treefmt-nix.url = "github:numtide/treefmt-nix";
    treefmt-nix.inputs.nixpkgs.follows = "nixpkgs";

    bun2nix.url = "github:nix-community/bun2nix";
    bun2nix.inputs.nixpkgs.follows = "nixpkgs";
    bun2nix.inputs.systems.follows = "systems";

    bun.url = "github:aster-void/bunnix";
    bun.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = inputs: let
    eachSystem = fn:
      inputs.nixpkgs.lib.genAttrs (import inputs.systems) (
        system:
          fn (import inputs.nixpkgs {
            inherit system;
            overlays = [
              inputs.bun2nix.overlays.default
              (_final: _prev: {
                bun = inputs.bun.packages.${system}.default;
              })
            ];
          })
      );

    treefmtEval = eachSystem (pkgs: inputs.treefmt-nix.lib.evalModule pkgs ./treefmt.nix);
  in {
    packages = eachSystem (pkgs: {
      default = pkgs.callPackage ./default.nix {};
    });

    devShells = eachSystem (pkgs: {
      default = pkgs.mkShell {
        packages = with pkgs; [
          bashInteractive
          bun
          bun2nix
        ];

        shellHook = ''
          bun install --frozen-lockfile
        '';
      };
    });

    formatter = eachSystem (pkgs: treefmtEval.${pkgs.stdenv.hostPlatform.system}.config.build.wrapper);
  };
}
