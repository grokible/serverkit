## serverkit

## npm install

This uses non-npm package references, e.g. (package.json dependency):

    "utilbase": "git@github.com:grokible/utilbase.git",

Because there are two of these dependencies, and a problem with npm,
you must use a passwordless .ssh key to access github.  Otherwise
there are issues with the authorization sequence.  (not clear if
ssh-agent will work with this).



