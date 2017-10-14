with import <nixpkgs> {}; {
   nodeEnv = stdenv.mkDerivation {
     name = "node-mp3totext";
     buildInputs = [ nodejs-8_x flac ];
   };
 }
