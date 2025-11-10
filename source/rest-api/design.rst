Design
======

The Design API provided by OpenProtein.ai builds on top of our predictive models to empower you to achieve your protein design goals easily.

Currently, we support the following design algorithms/models:

- **Genetic Algorithm** - Evolutionary optimization for sequence design using trained `predictors <./predictor.rst>`__.
- **RFdiffusion** - Diffusion-based structure generation for motif scaffolding, binder design, and symmetric assemblies. `GitHub link <https://github.com/RosettaCommons/RFdiffusion>`__, `Reference <https://www.biorxiv.org/content/10.1101/2022.12.09.519842v1>`__. Licensed under `BSD License <https://github.com/RosettaCommons/RFdiffusion/blob/main/LICENSE>`__.
- **BoltzGen** - Advanced diffusion model for protein structure and sequence design, supporting protein-ligand complexes, multi-chain assemblies, and cyclic peptides. `GitHub link <https://github.com/HannesStark/boltzgen>`__, `Reference <https://hannes-stark.com/assets/boltzgen.pdf>`__. Licensed under `MIT License <https://choosealicense.com/licenses/mit/>`__.

Endpoints
---------

.. raw:: html

    <script type="module" src="../_static/js/swaggerDesign.js"></script>
    <div id="swagger-ui"></div>
