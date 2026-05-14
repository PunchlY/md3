{
  projectRootFile = "flake.nix";

  programs.deadnix = {
    enable = true;
    priority = 1;
  };
  programs.alejandra = {
    enable = true;
    priority = 2;
  };

  programs.biome = {
    enable = true;
    settings = {
      formatter = {
        indentStyle = "space";
      };
    };
  };
}
