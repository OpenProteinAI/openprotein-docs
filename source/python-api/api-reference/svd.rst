openprotein.svd
===============

Fit SVD models on top of our protein language models to produce reduced embeddings, which can be used to train predictors!

Interface 
---------

.. autoclass:: openprotein.svd.SVDAPI
   :members:

Results
-------

.. autoclass:: openprotein.svd.SVDModel
   :members:


.. autoclass:: openprotein.svd.SVDEmbeddingsResultFuture
   :members:
   :inherited-members:

Classes
-------

.. autoclass:: openprotein.svd.SVDMetadata
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.svd.SVDFitJob
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.svd.SVDEmbeddingsJob
   :members:
   :exclude-members: model_config

