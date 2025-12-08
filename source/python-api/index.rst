
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
    
Python API Documentation
========================

The OpenProtein Python SDK provides a pythonic interface to the OpenProtein.AI platform for protein engineering. This client library enables you to leverage state-of-the-art foundation models, train custom predictors, design novel sequences, and predict protein structures.

Getting Started
---------------

1. **Install the package** via pip or conda (`installation guide <./installation.rst>`_)
2. **Create a session** to authenticate with the platform (`session setup <./overview.rst>`_)
3. **Choose your workflow** based on your protein engineering goals

Quick Start
^^^^^^^^^^^

.. code-block:: python

    import openprotein
    
    # Connect to the platform
    session = openprotein.connect(username="your_username", password="your_password")
    
    # Example: Generate embeddings
    future = session.embedding.esm2.embed(sequences=["ACDEFGHIKLMNPQRSTVWY"])
    embeddings = future.wait()

Core Concepts
-------------

Understanding these primitives will help you work effectively with the SDK:

**Session Management**
  The ``session`` object (``OpenProtein``) is your gateway to all platform capabilities. It manages authentication and provides access to all API modules (``session.embedding``, ``session.fold``, ``session.predictor``, etc.).

**Asynchronous Jobs**
  Most operations return ``Future`` objects that track asynchronous jobs. Use ``wait()`` to block until completion, or ``refresh()`` and ``done()`` to poll status. Learn more in the `Jobs System guide <./jobs-system.ipynb>`_.

**Protein Primitives**
  - ``Protein``: Represents a single protein chain with sequence and optional MSA
  - ``Chain``: Represents ligands, DNA, or RNA molecules  
  - ``Model``: A collection of proteins and chains forming a complex
  - ``AssayDataset``: Your experimental data (sequences + measured properties)

**Embeddings & Reductions**
  Foundation models produce embeddings that can be reduced (``MEAN``, ``SUM``), kept per-residue, or transformed with a custom-fitted SVD. These embeddings power downstream prediction and design tasks.

Platform Capabilities
---------------------

The SDK is organized around key protein engineering workflows:

Data & Embeddings
^^^^^^^^^^^^^^^^^

**Foundation Models** - Generate high-quality protein embeddings from state-of-the-art models

- Access to PoET and proprietary OpenProtein models, along with community-based models like ESM.
- Per-residue or reduced embeddings (mean/sum pooling)
- Logits and attention maps for interpretability
- `Tutorials <./foundation-models/index.rst>`_ | `API Reference <./api-reference/embedding.rst>`_

**PoET** - Conditional protein language model for zero-shot prediction and generation

- Create prompts from MSAs to condition on protein families
- Score sequences without experimental data
- Generate novel sequences with desired properties
- Single-site analysis for variant effect prediction
- `Tutorials <./poet/index.rst>`_ | `API Reference <./api-reference/embedding.rst#openprotein.embeddings.PoETModel>`_

**Data Management** - Upload and manage your experimental datasets

- Store assay data (sequences + measurements) on the platform
- Use datasets for training predictors and design workflows
- `API Reference <./api-reference/data.rst>`_

Prediction & Design
^^^^^^^^^^^^^^^^^^^

**Property Regression Models** - Train custom models on your data

- Fit Gaussian Process models using foundation model embeddings
- Cross-validation for uncertainty estimation
- Predict properties for novel sequences
- Single-site saturation mutagenesis analysis
- `Tutorials <./property-regression-models/index.rst>`_ | `API Reference <./api-reference/predictor.rst>`_

**Sequence Design** - Optimize sequences for your objectives

- Genetic algorithm-based design using trained predictors
- Multi-objective optimization support
- Design novel variants optimized for your measured properties
- `Tutorials <./property-regression-models/index.rst>`_ | `API Reference <./api-reference/design.rst>`_

Structure
^^^^^^^^^

**Structure Prediction** - Predict 3D structures from sequences

- ESMFold for fast single-chain folding
- AlphaFold2 for high-accuracy multi-chain complexes
- Boltz (1, 1x, 2) for advanced complex prediction with constraints
- RosettaFold3 for alternative multi-chain folding
- `Tutorials <./structure-prediction/index.rst>`_ | `API Reference <./api-reference/fold.rst>`_

**Structure Generation** - Design novel protein structures de novo

- RFdiffusion for diffusion-based structure generation
- BoltzGen for generative structure design
- Useful for binder design and scaffold generation
- `Tutorials <./structure-generation/index.rst>`_ | `API Reference <./api-reference/models.rst>`_

Supporting Tools
^^^^^^^^^^^^^^^^

**Alignment** - Multiple sequence alignment and antibody numbering

- Create MSAs via homology search (MMseqs2)
- MAFFT and ClustalOmega alignment
- AbNumber for antibody numbering schemes
- `API Reference <./api-reference/align.rst>`_

**Dimensionality Reduction** - Visualize and analyze embeddings

- SVD for linear dimensionality reduction
- UMAP for non-linear manifold learning
- Fit on training data, transform new sequences
- `API Reference <./api-reference/svd.rst>`_ | `API Reference <./api-reference/umap.rst>`_

Common Workflows
----------------

**Workflow 1: Zero-shot prediction with PoET**

1. Create MSA from your seed sequence → ``session.align.create_msa()``
2. Create a prompt from the MSA → ``session.prompt.create()``
3. Score your variants → ``session.embedding.poet.score()``

**Workflow 2: Train a custom predictor**

1. Upload your assay data → ``session.data.create()``
2. Train a GP model → ``session.embedding.esm2.fit_gp()``
3. Predict on new sequences → ``predictor.predict()``
4. Design optimized variants → ``session.design.genetic_algorithm()``

**Workflow 3: Structure prediction**

1. For single chains: ``session.fold.esmfold.fold()``
2. For complexes: Create MSA → Build ``Protein`` objects → ``session.fold.alphafold2.fold()``

Next Steps
----------

- **New users**: Start with `Installation <./installation.rst>`_ and `Session Setup <./overview.rst>`_
- **Learn the basics**: Review the `Jobs System <./jobs-system.ipynb>`_ to understand async operations
- **Explore tutorials**: Browse capability-specific tutorials below
- **API reference**: Detailed documentation for all classes and methods

.. toctree::
   :maxdepth: 2
   :hidden:

   installation
   overview
   Jobs System <jobs-system.ipynb>
   Foundation Models <foundation-models/index>
   PoET <poet/index>
   Property Regression Models <property-regression-models/index>
   Structure Prediction <structure-prediction/index>
   Structure Generation <structure-generation/index>
   API Reference <api-reference/index>
