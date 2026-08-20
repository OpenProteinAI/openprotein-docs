Structure Prediction
====================

The Structure Prediction API provided by OpenProtein.AI allows you to generate protein structures from both proprietary and open source models.

You can list the available models with ``/fold/models`` and view a model summary (including usage, citations, limitations and more) with ``/fold/model/{model_id}``.

Currently, we support the following models:

- **ESMFold**: Open-sourced ESMFold model. `GitHub link <https://github.com/facebookresearch/esm>`__, `Reference <https://www.science.org/doi/10.1126/science.ade2574>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__.
- **AlphaFold2**: Open-sourced Alphafold 2 implementation using ColabFold. `GitHub link <https://github.com/sokrypton/ColabFold>`__, `Reference <https://www.nature.com/articles/s41592-022-01488-1>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__.
- **Boltz-2, Boltz-1x, Boltz-1**: Open-source Boltz models. `GitHub link <https://github.com/jwohlwend/boltz>`__, `Boltz-1 reference <https://www.biorxiv.org/content/10.1101/2024.11.19.624167v1>`__, `Boltz-2 <https://www.biorxiv.org/content/10.1101/2025.06.14.659707v1>`__. Licensed under `MIT <https://choosealicense.com/licenses/mit/>`__. 
- **Protenix**: Open-source Protenix model. `GitHub link <https://github.com/bytedance/Protenix>`_, `Reference <https://www.biorxiv.org/content/early/2026/02/22/2026.02.05.703733.1>`_. Licensed under `Apache-2.0 <https://choosealicense.com/licenses/apache-2.0/>`_.
- **OpenDDE, OpenDDE-abag**: Open-source OpenDDE all-atom co-folding models, predicting protein, DNA, RNA, ligand and ion complexes in a single structure. ``opendde-abag`` is tuned on antibody-antigen complexes. `GitHub link <https://github.com/aurekaresearch/OpenDDE>`__, `Reference <https://arxiv.org/abs/2607.03787>`__. Licensed under `Apache-2.0 <https://choosealicense.com/licenses/apache-2.0/>`__.
- **RosettaFold-3**: Open-source RosettaFold-3 model. `GitHub link <https://github.com/RosettaCommons/modelforge>`__, `Reference <https://www.biorxiv.org/content/10.1101/2025.08.14.670328v2>`__. Licensed under `BSD-3 <https://choosealicense.com/licenses/bsd-3-clause/>`__. 

Endpoints
---------

.. raw:: html

    <script type="module" src="/_static/js/swaggerFold.js"></script>
    <div id="swagger-ui"></div>

