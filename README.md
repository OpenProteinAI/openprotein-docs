# OpenProtein Documentation

This repository contains the source code for the OpenProtein documentation, built with Sphinx.

## Building the documentation

To build the documentation, first install the dependencies from `pyproject.toml`. Our project uses `pixi` as a package manager but `pip install should work`:

```bash
pip install .

# if using pixi
# pixi install
```

Then run the build command:

```bash
sphinx-build source build

# if using pixi
# pixi run build
```

The built documentation will be in the `build/` directory.

## Development

For live hot reloading during development, use `sphinx-autobuild`:

```bash
# use dev dependency which provides sphinx-autobuild
pip install .[dev]
sphinx-autobuild source build/html --port 5001

# if using pixi just run
pixi run dev
```

This will serve the docs at http://localhost:5001 and automatically reload on changes.
