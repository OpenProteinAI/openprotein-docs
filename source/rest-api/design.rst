Design
======

The Design API provided by OpenProtein.AI allows you to design new protein sequences and structures.

Sequence generation is done using **Genetic Algorithm** using the property ``predictors`` that you train on your datasets.

Currently, we support the following design approaches:

- **Genetic Algorithm** - Evolutionary optimization for sequence design
- **RFdiffusion** - Diffusion-based structure generation for motif scaffolding, binder design, and symmetric assemblies
- **BoltzGen** - Advanced diffusion model for protein structure and sequence design, supporting protein-ligand complexes, multi-chain assemblies, and cyclic peptides

Endpoints
---------

.. raw:: html

    <script type="module" src="../_static/js/swaggerDesign.js"></script>
    <div id="swagger-ui"></div>
