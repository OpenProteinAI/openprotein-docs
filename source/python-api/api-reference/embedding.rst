openprotein.embeddings
======================

Create embeddings for your protein sequences using open-source and proprietary models!

Note that for PoET Models, you will also need to supply a :py:class:`~openprotein.prompt.Prompt`.

Interface 
---------

.. autoclass:: openprotein.embeddings.EmbeddingsAPI
   :members:

Models 
------

.. autoclass:: openprotein.embeddings.PoET2Model
   :members:
   :inherited-members:
   :exclude-members: create, get_model

.. autoclass:: openprotein.embeddings.PoETModel
   :members:
   :inherited-members:
   :exclude-members: create, get_model

.. autoclass:: openprotein.embeddings.AbLang2Model
   :members:
   :inherited-members:
   :exclude-members: create, get_model

.. autoclass:: openprotein.embeddings.OpenProteinModel
   :members:
   :inherited-members:
   :exclude-members: create, get_model

.. autoclass:: openprotein.embeddings.ESMModel
   :members:
   :inherited-members:
   :exclude-members: create, get_model

These embedding models inherit from a base :py:class:`~openprotein.embeddings.EmbeddingModel`, due to their shared functionality in providing the :py:meth:`~openprotein.embeddings.EmbeddingModel.embed` method. These can also be used to fit the :ref:`transform-models`.

.. autoclass:: openprotein.embeddings.EmbeddingModel
   :members: 

.. _transform-models:

Transform Models
^^^^^^^^^^^^^^^^

These models are overlaid on top of the base embeddings models to produce reduced/transformed embeddings. 

:py:class:`~openprotein.svd.SVDModel` represents an SVD model which is suitable to reduce the high-dimensional embeddings returned by base embedding models, whilst maintaining semantic information, fitted on your :py:class:`~openprotein.data.AssayDataset`. You can fit your own SVD from any model's :py:meth:`~openprotein.embeddings.EmbeddingModel.fit_svd`.  
      
.. autoclass:: openprotein.svd.SVDModel
   :members:
   :inherited-members:

:py:class:`~openprotein.umap.UMAPModel` represents a UMAP model which is suitable to project the high-dimensional embeddings into a lower dimension (usually 2) for visualization, to understand the semantic grouping within your :py:class:`~openprotein.data.AssayDataset`. You can fit your own UMAP from any model's :py:meth:`~openprotein.embeddings.EmbeddingModel.fit_umap`.  

.. autoclass:: openprotein.umap.UMAPModel
   :members:
   :inherited-members:

Reduction methods
^^^^^^^^^^^^^^^^^

Foundational embedding models also take an optional reduction to use simple pooling methods:

.. autoclass:: openprotein.common.ReductionType()
   :members:

.. note::

   By default, the :py:meth:`~openprotein.embeddings.EmbeddingModel.embed` method uses the :py:attr:`~openprotein.common.ReductionType.MEAN` reduction to reduce network load. You have to explicitly pass ``reduction=None`` to get full-sized embeddings.

Results
-------

.. autoclass:: openprotein.embeddings.EmbeddingsResultFuture
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.EmbeddingsScoreFuture
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.EmbeddingsGenerateFuture
   :members:
   :inherited-members:

