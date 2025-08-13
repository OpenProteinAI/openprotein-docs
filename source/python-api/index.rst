
.. raw:: html

    <div class="d-flex align-items-center">
        <a href="https://pypi.org/project/openprotein-python/" target="_blanc">
            <img src=" https://badge.fury.io/py/openprotein-python.svg" class="mb-2 me-1"/>
        </a>
        <a  href="https://anaconda.org/openprotein/openprotein-python" target="_blanc" >
            <img src="https://anaconda.org/openprotein/openprotein-python/badges/version.svg" class="mb-2 me-1"/>
        </a>
        <a href="https://github.com/OpenProteinAI/openprotein-python" target="_blank">
            <img src="../_static/github.svg" class="mb-2 me-1"/>
        </a>
    </div>
    
Python API documentation
========================

This section of our site provides documentation supporting our Python client API.

After `installing <./installation.rst>`_ the Python client and `setting up your session <./overview.rst>`_, get started with our docs to use OpenProtein.AI's key platform capabilities with Python.

**Property Regression Models** enable you to train custom models, predict sequence function, and make improved designs in the context of your data.

- `API Reference <./api-reference/predictor.rst#openprotein.predictor.PredictorModel>`_

- `Tutorials <./property-regression-models/index.rst>`_


**PoET** provides tools using our state-of-the-art generative model for *de novo* variant effect prediction and controllable protein sequence design.

- `API Reference <./api-reference/embedding.rst#openprotein.embeddings.PoETModel>`_

- `Tutorials <./poet/index.rst>`_

**Foundation Models** provide access to high-quality protein sequence embeddings from open source models, and our proprietary models.

- `API Reference <./api-reference/index.rst#foundation-models>`_

- `Tutorials <./foundation-models/index.rst>`_

**Structure Prediction** enables you to generate high-quality structure predictions via ESMFold and AlphaFold2.

- `API Reference <./api-reference/fold.rst>`_

- `Tutorials <./structure-prediction/index.rst>`_

**Structure Generation** using RFdiffusion allows you to generate de novo protein structures based on your design goals.

- `API Reference <./api-reference/design.rst>`_

- `Tutorials <./structure-generation/index.rst>`_

.. toctree::
   :maxdepth: 2
   :hidden:
   
   Jobs System <jobs-system.ipynb>
   installation
   overview
   Property Regression Models <property-regression-models/index>
   PoET <poet/index>
   Foundation Models <foundation-models/index>
   Structure Prediction <structure-prediction/index>
   Structure Generation <structure-generation/index>
   API Reference <api-reference/index>
