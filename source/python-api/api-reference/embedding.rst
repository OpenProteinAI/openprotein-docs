openprotein.embeddings
======================

Create embeddings for your protein sequences using open-source and proprietary models!

Note that for PoET Models, you will also need to utilize our :doc:`align <align>`. workflow.

Interface 
---------

.. autoclass:: openprotein.embeddings.EmbeddingsAPI
   :members:

Models 
------

.. autoclass:: openprotein.embeddings.PoET2Model
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.PoETModel
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.OpenProteinModel
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.ESMModel
   :members:
   :inherited-members:

Transform models
^^^^^^^^^^^^^^^^

These models are overlaid on top of the base embeddings models to produce reduced/transformed embeddings. Refer to their detailed documentation in `openprotein.svd <./svd.rst#openprotein.svd.SVDModel>`_ and `openprotein.umap <./umap.rst#openprtein.umap.UMAPModel>`_.
      
.. autoclass:: openprotein.svd.SVDModel

.. autoclass:: openprotein.umap.UMAPModel

Results
---------

.. autoclass:: openprotein.embeddings.EmbeddingsResultFuture
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.EmbeddingsScoreFuture
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.EmbeddingsGenerateFuture
   :members:
   :inherited-members:

Base model
----------

The base embedding model is the base class of all the embedding models.

.. autoclass:: openprotein.embeddings.EmbeddingModel
