Structure Prediction
====================

The Structure Prediction API provided by OpenProtein.AI allows you to generate protein structures from both proprietary and open source models.

You can list the available models with ``/fold/models`` and view a model summary (including usage, citations, limitations and more) with ``/fold/model/{model_id}``.

Currently, we support the following models:

- **ESMFold**: Open-sourced ESMFold model. `GitHub link <https://github.com/facebookresearch/esm>`__, `Reference <https://www.science.org/doi/10.1126/science.ade2574>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__.
- **AlphaFold2**: Open-sourced Alphafold 2 implementation using ColabFold. `GitHub link <https://github.com/sokrypton/ColabFold>`__, `Reference <https://www.nature.com/articles/s41592-022-01488-1>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__.
- **Boltz-2, Boltz-1x, Boltz-1**: Open-source Boltz models. `GitHub link <https://github.com/jwohlwend/boltz>`__, `Boltz-1 reference <https://www.biorxiv.org/content/10.1101/2024.11.19.624167v1>`__, `Boltz-2 <https://www.biorxiv.org/content/10.1101/2025.06.14.659707v1>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__. 

Endpoints
---------

.. raw:: html

    <script type="module" src="../_static/js/swaggerFold.js"></script>
    <div id="swagger-ui"></div>

