
.. raw:: html

    <div class="d-flex align-items-center">
        <a href="https://pypi.org/project/openprotein-python/" target="_blanc">
            <img src=" https://badge.fury.io/py/openprotein-python.svg" class="mb-2 me-1"/>
        </a>
        <a  href="https://anaconda.org/openprotein/openprotein-python" target="_blanc" >
            <img src="https://anaconda.org/openprotein/openprotein-python/badges/version.svg" class="mb-2 me-1"/>
        </a>
        <a href="https://github.com/OpenProteinAI/openprotein-python" target="_blank">
            <img src="/_static/github.svg" class="mb-2 me-1"/>
        </a>
    </div>
    
Python API Documentation
========================

The OpenProtein Python SDK provides a pythonic interface to the OpenProtein.AI platform for protein engineering. This client library enables you to leverage state-of-the-art foundation models, train custom predictors, design novel sequences, and predict protein structures.

Getting Started
---------------

1. **Install the package** via pip or conda (:doc:`installation guide <installation>`)
2. **Create a session** to authenticate with the platform (:ref:`session setup <authentication>`)
3. **Choose your workflow** based on your protein engineering goals

Usage
^^^^^

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
  The ``session`` object (:py:class:`~openprotein.OpenProtein`) is your gateway to all platform capabilities. It manages authentication and provides access to all API modules (``session.embedding``, ``session.fold``, ``session.predictor``, etc.).

**Asynchronous Jobs**
  Most operations return :py:class:`~openprotein.jobs.Future` objects that track asynchronous jobs. Use :py:meth:`~openprotein.jobs.Future.wait` to block until completion, and retrieve the results. Learn more in the :ref:`jobs-system` section.

**Protein Primitives**
  - :py:class:`~openprotein.Protein`: Represents a single protein chain with sequence and optional MSA
  - :py:class:`~openprotein.Ligand`, :py:class:`~openprotein.DNA`, :py:class:`~openprotein.RNA`: Represents other possible chains  
  - :py:class:`~openprotein.Model`: A collection of proteins and chains forming a complex
  - :py:class:`~openprotein.data.AssayDataset`: Your experimental data (sequences + measured properties)

**Embeddings & Reductions**

  Foundation models produce embeddings that can be reduced (:py:attr:`~openproten.common.ReductionType.MEAN`, :py:attr:`~openproten.common.ReductionType.SUM`), kept per-residue (with ``reduction=None``), or transformed with a custom-fitted SVD. These embeddings power downstream prediction and design tasks.

Platform Capabilities
---------------------

The SDK is organized around key protein engineering workflows:

Foundation Models
^^^^^^^^^^^^^^^^^

Foundation models provide high-quality protein embeddings and sequence-level
representations for downstream analysis and design.

They support both general-purpose and protein-family–conditioned workflows.

**Capabilities**

- Access to PoET, proprietary OpenProtein models, and community models such as ESM
- Per-residue embeddings or reduced representations (mean / sum pooling)
- Logits and attention maps for interpretability

.. rubric:: Learn more

- :doc:`Tutorials <foundation-models/index>`
- :doc:`API Reference <api-reference/embedding>`


PoET
""""

PoET is a conditional protein language model designed for zero-shot prediction
and generation conditioned on protein families.

**Capabilities**

- Prompt construction from MSAs
- Zero-shot sequence scoring without experimental data
- Conditional sequence generation
- Single-site variant effect analysis

.. rubric:: Learn more

- :doc:`poet/index`
- :class:`~openprotein.embeddings.PoETModel`

Data Management
^^^^^^^^^^^^^^^

Upload and manage your experimental datasets

- Store assay data (sequences + measurements) on the platform
- Use datasets for training predictors and design workflows

.. rubric:: Learn more

- :doc:`API Reference <api-reference/data>`

Prediction & Design
^^^^^^^^^^^^^^^^^^^

Property Regression Models
""""""""""""""""""""""""""

Train custom models on your data

- Fit Gaussian Process models using foundation model embeddings
- Cross-validation for uncertainty estimation
- Predict properties for novel sequences
- Single-site saturation mutagenesis analysis

.. rubric:: Learn more

- :doc:`property-regression-models/index`
- :doc:`API Reference <api-reference/predictor>`

Sequence Design
"""""""""""""""

Optimize sequences for your objectives

- Genetic algorithm-based design using trained predictors
- Multi-objective optimization support
- Design novel variants optimized for your measured properties

.. rubric:: Learn more

- :doc:`property-regression-models/index`
- :doc:`API Reference <api-reference/design>`

Structure
^^^^^^^^^

Structure Prediction
""""""""""""""""""""

Predict 3D structures from sequences

- ESMFold for fast single-chain folding
- AlphaFold2 for high-accuracy multi-chain complexes
- Boltz (1, 1x, 2) for advanced complex prediction with constraints
- RosettaFold3 for alternative multi-chain folding

.. rubric:: Learn more

- :doc:`structure-prediction/index`
- :doc:`API Reference <api-reference/fold>`

Structure Generation
""""""""""""""""""""

Design binders or novel protein structures de novo

- RFdiffusion for diffusion-based structure generation
- BoltzGen for generative structure design
- Useful for binder design and scaffold generation
  
.. rubric:: Learn more

- :doc:`structure-generation/index`
- :doc:`API Reference <api-reference/models>`

Supporting Tools
^^^^^^^^^^^^^^^^

Alignment
"""""""""

Multiple sequence alignment and antibody numbering

- Create MSAs via homology search (MMseqs2)
- MAFFT and ClustalOmega alignment
- AbNumber for antibody numbering schemes

.. rubric:: Learn more

- :doc:`API Reference <api-reference/align>`

Dimensionality Reduction
""""""""""""""""""""""""

Visualize and analyze embeddings

- SVD for linear dimensionality reduction
- UMAP for non-linear manifold learning
- Fit on training data, transform new sequences

.. rubric:: Learn more

- :ref:`transform-models`

Common Workflows
----------------

**Workflow 1: Zero-shot prediction with PoET**

1. Create MSA from your seed sequence →  `session.align.create_msa`
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

- **New users**: Start with :doc:`installation` and :doc:`quickstart`
- **Learn the basics**: Review the :ref:`jobs-system` to understand async operations
- **Explore tutorials**: Browse capability-specific tutorials below
- **API reference**: Detailed documentation for all classes and methods

.. toctree::

   Overview <self>
   installation
   quickstart

.. toctree::
   :caption: Core Concepts

   core-concepts/proteins-sequences.rst
   core-concepts/prompt-query.rst
   core-concepts/foundational-models.rst
   core-concepts/structure-prediction.rst
   core-concepts/data-management.rst

.. toctree::
   :caption: Workflows

   foundation-models/index
   poet/index
   property-regression-models/index
   structure-prediction/index
   structure-generation/index
   api-reference/index
