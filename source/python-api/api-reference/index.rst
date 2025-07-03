API reference
=============


Property Regression Models
--------------------------

Data
^^^^
.. autosummary::

   openprotein.data.DataAPI
   openprotein.data.AssayDataset

..
    Train
    ^^^^^
    .. autosummary::

    openprotein.api.train.TrainingAPI
    openprotein.api.train.TrainFuture
    openprotein.api.predict.PredictFuture

Predictor
^^^^^^^^^
.. autosummary::

   openprotein.predictor.PredictorAPI
   openprotein.predictor.PredictorModel

Design
^^^^^^
.. autosummary::

   openprotein.design.DesignAPI
   openprotein.design.DesignFuture


Foundation models 
-----------------

Endpoints
^^^^^^^^^
.. autosummary::

   openprotein.embeddings.EmbeddingsAPI
   

Models
^^^^^^
.. autosummary::

   openprotein.embeddings.OpenProteinModel
   openprotein.embeddings.ESMModel
   openprotein.embeddings.PoET2Model
   openprotein.embeddings.PoETModel
   openprotein.embeddings.SVDModel
   openprotein.embeddings.UMAPModel

Results
^^^^^^^
.. autosummary::

   openprotein.embeddings.EmbeddingsResultFuture
   openprotein.embeddings.EmbeddingsScoreFuture
   openprotein.embeddings.EmbeddingsGenerateFuture

Align
-----

.. autosummary::

   openprotein.align.AlignAPI
   openprotein.align.PromptFuture
   openprotein.align.MSAFuture

Fold
----

.. autosummary::

   openprotein.fold.FoldAPI
   openprotein.fold.ESMFoldModel
   openprotein.fold.AlphaFold2Model
   openprotein.fold.FoldResultFuture


.. toctree::
   :maxdepth: 2
   :hidden:
   
   basics
   data
   predictor
   design
   embedding
   align 
   fold
