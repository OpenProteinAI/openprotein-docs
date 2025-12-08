API Reference
=============

This reference documents all public classes and methods in the OpenProtein Python SDK.

Core Components
---------------

Session
^^^^^^^

The main entry point for interacting with the OpenProtein.AI platform.

.. autosummary::
   :toctree: generated/

   openprotein.OpenProtein

Jobs & Futures
^^^^^^^^^^^^^^

All API operations return ``Future`` objects for asynchronous job tracking. Use ``wait()`` to block until completion and retrieve results, or ``wait_until_done()`` followed by ``get()`` for more control.

.. autosummary::
   :toctree: generated/

   openprotein.jobs.JobsAPI
   openprotein.jobs.Future
   openprotein.jobs.Job
   openprotein.jobs.JobStatus


**JobStatus**: PENDING, RUNNING, SUCCESS, FAILED

Data Primitives
---------------

Core data structures for representing proteins, complexes, and experimental data.

Protein Structures
^^^^^^^^^^^^^^^^^^

.. autosummary::
   :toctree: generated/

   openprotein.protein.Protein
   openprotein.chains.DNA
   openprotein.chains.RNA
   openprotein.chains.Ligand
   openprotein.model.Model

**Protein** represents a single protein chain with sequence and optional MSA/structure data.

**DNA/RNA/Ligand** represents non-protein components in a complex.

**Model** represents a multi-chain complex (proteins + chains) for structure prediction and analysis.

Assay Data
^^^^^^^^^^

.. autosummary::
   :toctree: generated/

   openprotein.data.DataAPI
   openprotein.data.AssayDataset
   openprotein.data.AssayMetadata

Upload and manage experimental datasets with measured properties for training predictors and design workflows.


Foundation Models & Embeddings
------------------------------

Generate embeddings, logits, and scores using protein language models.

Embedding API
^^^^^^^^^^^^^

.. autosummary::
   :toctree: generated/

   openprotein.embeddings.EmbeddingsAPI

Model Classes
^^^^^^^^^^^^^

Each model class provides access to specific foundation models with their unique capabilities.

.. autosummary::
   :toctree: generated/

   openprotein.embeddings.PoET2Model
   openprotein.embeddings.PoETModel
   openprotein.embeddings.ESMModel
   openprotein.embeddings.OpenProteinModel

**PoET2Model**: Multimodal conditional model with structure and sequence conditioning (1536 dim)

**PoETModel**: Sequence-conditioned generative model for scoring and generation (1280 dim)

**ESMModel**: Meta's ESM family (ESM1b, ESM1v, ESM2 variants, 320-2560 dim)

**OpenProteinModel**: OpenProtein's proprietary models (prot-seq, rotaprot variants, 1024-1536 dim)

Result Types
^^^^^^^^^^^^

.. autosummary::
   :toctree: generated/

   openprotein.embeddings.EmbeddingsResultFuture
   openprotein.embeddings.EmbeddingsScoreFuture
   openprotein.embeddings.EmbeddingsGenerateFuture


PoET Prompts & Queries
----------------------

Create and manage prompts for conditioning PoET models on specific protein families.

.. autosummary::
   :toctree: generated/

   openprotein.prompt.PromptAPI
   openprotein.prompt.Prompt
   openprotein.prompt.Query


Sequence Alignment
------------------

Generate multiple sequence alignments (MSA) for evolutionary analysis and structure prediction.

.. autosummary::
   :toctree: generated/

   openprotein.align.AlignAPI
   openprotein.align.MSAFuture

Supports MAFFT, ClustalOmega, and homology search via MMseqs2. Required for AlphaFold2 and Boltz folding.


Dimensionality Reduction
------------------------

Reduce embedding dimensions for visualization and downstream analysis.

SVD
^^^

.. autosummary::
   :toctree: generated/

   openprotein.svd.SVDAPI
   openprotein.svd.SVDModel

UMAP
^^^^

.. autosummary::
   :toctree: generated/

   openprotein.umap.UMAPAPI
   openprotein.umap.UMAPModel


Property Prediction
-------------------

Train Gaussian Process models on assay data and predict properties for novel sequences.

.. autosummary::
   :toctree: generated/

   openprotein.predictor.PredictorAPI
   openprotein.predictor.PredictorModel
   openprotein.predictor.PredictionResultFuture

Train on ``AssayDataset`` with any embedding model, then predict fitness, stability, or custom properties.


Sequence Design
---------------

Generate optimized sequences using genetic algorithms and trained predictors.

.. autosummary::
   :toctree: generated/

   openprotein.design.DesignAPI
   openprotein.design.DesignFuture

Design sequences to maximize predicted properties while maintaining similarity to parent sequences.


Structure Prediction
--------------------

Predict 3D structures from sequences using state-of-the-art folding models.

Fold API
^^^^^^^^

.. autosummary::
   :toctree: generated/

   openprotein.fold.FoldAPI

Folding Models
^^^^^^^^^^^^^^

.. autosummary::
   :toctree: generated/

   openprotein.fold.ESMFoldModel
   openprotein.fold.AlphaFold2Model
   openprotein.fold.Boltz1Model
   openprotein.fold.Boltz1xModel
   openprotein.fold.Boltz2Model

**ESMFold**: Fast single-chain folding, no MSA required

**AlphaFold2**: High-accuracy multi-chain folding, requires MSA

**Boltz1/1x/2**: Multi-chain folding with constraints and affinity prediction

Result Types
^^^^^^^^^^^^

.. autosummary::
   :toctree: generated/

   openprotein.fold.FoldResultFuture
   openprotein.fold.FoldComplexResultFuture


Structure Generation
--------------------

Generate novel protein structures using diffusion models.

.. autosummary::
   :toctree: generated/

   openprotein.models.ModelsAPI
   openprotein.models.foundation.rfdiffusion.RFdiffusionModel
   openprotein.models.foundation.boltzgen.BoltzGenModel

**RFdiffusion**: Diffusion-based structure generation for binder design

**BoltzGen**: Generative model for protein structure design


Enumerations & Constants
-------------------------

Common enumerations used throughout the SDK.

.. autosummary::
   :toctree: generated/

   openprotein.common.reduction.ReductionType

**ReductionType**: MEAN, SUM for embedding reduction
