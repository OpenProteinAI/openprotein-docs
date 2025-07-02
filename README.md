# OpenProtein Documentation

This repository contains the source code for the OpenProtein documentation, built with Sphinx.

## Building the documentation

To build the documentation, first install the dependencies from `pyproject.toml`:

```bash
pip install .
```

Then, from the `source` directory, run the following command:

```bash
make html
```

The built documentation will be in the `build/html` directory.

## Development

For live hot reloading during development, use `sphinx-autobuild`:

```bash
# use dev dependency which provides sphinx-autobuild
pip install .[dev]
# use port 5001 which is set up for CORS on dev.
sphinx-autobuild source build/html --port 5001
```

This will serve the docs at http://localhost:5001 and automatically reload on changes.
