# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

from recommonmark.transform import AutoStructify

project = "OpenProtein-Docs"
copyright = "2025, NE47 Bio – All Rights Reserved"
author = "NE47.bio"

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.napoleon",
    "sphinx.ext.viewcode",
    "recommonmark",
    "sphinx_markdown_tables",
    "sphinx_markdown_builder",
    "nbsphinx",
    "sphinx.ext.duration",
    "sphinx.ext.doctest",
    "sphinx.ext.autosummary",
    "sphinx.ext.intersphinx",
    "sphinx.ext.todo",
    "sphinx_togglebutton",
    "sphinx_copybutton",
    "sphinxcontrib.bibtex",
    "swagger_plugin_for_sphinx",
    "sphinxcontrib.httpdomain",
    "sphinx_new_tab_link",
    "notfound.extension",
    "sphinx_panels",
]

# -- Options for autodoc ----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/extensions/autodoc.html#configuration
autoclass_content = "class"

# Automatically extract typehints when specified and place them in
# descriptions of the relevant function/method.
autodoc_typehints = "description"

# Don't show class signature with the class' name.
autodoc_class_signature = "separated"

templates_path = ["_templates"]
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = "pydata_sphinx_theme"


html_static_path = ["_static"]
html_css_files = [
    "css/custom.css",
    "css/swagger-ui.css",
]

html_logo = "./_static/logo.svg"
html_favicon = "./_static/favicon.svg"

language = "en"
html_sourcelink_suffix = ""

html_sidebars = {
    "**": ["search-field.html", "sidebar-nav-bs.html", "sidebar-ethical-ads.html"],
    "index": ["sidebar-ethical-ads.html"],
}

html_theme_options = {
    "header_links_before_dropdown": 6,
    "show_prev_next": False,
    "use_edit_page_button": False,
    "show_nav_level": 0,
    "navbar_align": "left",
    "navbar_end": ["navbar-custom", "navbar-icon-links"],
}

html_context = {
    "default_mode": "light",
}

html_show_sourcelink = False

nbsphinx_execute = "never"

bibtex_bibfiles = [
    "./walkthroughs/references-antibody.bib",
    "./walkthroughs/references-enzymes.bib",
    "./resources/references.bib",
]

notfound_urls_prefix = None

# -- Google Analytics -------------------------------------------------
# https://pydata-sphinx-theme.readthedocs.io/en/latest/user_guide/analytics.html
html_theme_options["analytics"] = {
    "google_analytics_id": "G-SS7ET8W19C",
}

autodoc_member_order = "bysource"


def setup(app):
    app.add_js_file("js/swagger-ui-bundle.js")
    app.add_transform(AutoStructify)
