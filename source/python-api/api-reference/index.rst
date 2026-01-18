API reference
=============

Session Management
------------------

The entrypoint to our platform which requires an authenticated session.

.. autosummary::

   openprotein.OpenProtein
   openprotein.connect

Data Primitives
---------------

Create and manipulate molecular primitives that can be used on our platform for doing protein engineering tasks like structure prediction and binder design. 

Property Regression Models
--------------------------

.. autosummary::

   openprotein.molecules.Protein
   openprotein.molecules.Complex
   openprotein.molecules.Structure
   openprotein.molecules.Ligand
   openprotein.molecules.DNA
   openprotein.molecules.RNA

Data
^^^^

Upload and store your datasets on our platform to use with your protein engineering tasks.

.. autosummary::

   openprotein.data.DataAPI
   openprotein.data.AssayDataset

Jobs
^^^^

Retrieve and monitor your jobs.

.. autosummary::

   openprotein.jobs.JobsAPI
   openprotein.jobs.Job

Align
-----

Align your protein sequences or look up multiple sequence alignments.

.. autosummary::

   openprotein.align.AlignAPI
   openprotein.align.MSAFuture

Prompt
------

Create prompts using sequences and structures to condition our proprietary high-performance PoET foundation models.

.. autosummary::

   openprotein.prompt.PromptAPI
   openprotein.prompt.Prompt
   openprotein.prompt.Query


Foundation models 
-----------------

Use foundation models to produce embeddings and logits with your protein sequences.

.. autosummary::

   openprotein.embeddings.EmbeddingsAPI
   

Models
^^^^^^

The foundation models on our platform are classed appropriately to identify the models and group their functionality.

.. autosummary::

   openprotein.embeddings.PoET2Model
   openprotein.embeddings.PoETModel
   openprotein.embeddings.OpenProteinModel
   openprotein.embeddings.ESMModel

Results
^^^^^^^

The models produce asynchronous results which are modeled as futures which can be awaited.

.. autosummary::

   openprotein.embeddings.EmbeddingsResultFuture
   openprotein.embeddings.EmbeddingsScoreFuture
   openprotein.embeddings.EmbeddingsGenerateFuture

Transform
---------

Transform and reduce your embeddings for use with visualization and training workflows.

SVD
^^^
.. autosummary::

   openprotein.svd.SVDAPI
   openprotein.svd.SVDModel

UMAP
^^^^
.. autosummary::

   openprotein.umap.UMAPAPI
   openprotein.umap.UMAPModel

Predictor
---------

Train predictors from your assay datasets and use them to make predictions on novel sequences.

.. autosummary::

   openprotein.predictor.PredictorAPI
   openprotein.predictor.PredictorModel
   openprotein.predictor.PredictionResultFuture

Design
------

Design novel protein sequences based on your assay datasets and trained models, optimizing toward your design criteria.

.. autosummary::

   openprotein.design.DesignAPI
   openprotein.design.DesignFuture

Fold
----

Make structure predictions on your protein sequences.

.. autosummary::

   openprotein.fold.FoldAPI
   openprotein.fold.RosettaFold3Model
   openprotein.fold.Boltz2Model
   openprotein.fold.Boltz1xModel
   openprotein.fold.Boltz1Model
   openprotein.fold.AlphaFold2Model
   openprotein.fold.ESMFoldModel
   openprotein.fold.FoldResultFuture

Models
------

Unified access to the models available on our platform.

.. autosummary::

   openprotein.models.ModelsAPI
   openprotein.models.RFdiffusionModel
   openprotein.models.ProteinMPNNModel
   openprotein.models.BoltzGenModel
  
.. toctree::
   :hidden:
   
   openprotein
   molecules
   data
   jobs
   align 
   prompt
   embedding
   predictor
   design
   fold
   models
