openprotein.embeddings
======================

Create embeddings for your protein sequences using open-source and proprietary models!

Note that for PoET Models, you will also need to utilize our :doc:`align <align>`. workflow.

Endpoints
-----------
.. autoclass:: openprotein.embeddings.EmbeddingsAPI
   :members:
   :undoc-members:

Models 
------------

.. autoclass:: openprotein.embeddings.OpenProteinModel
   :members:
   :undoc-members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.ESMModel
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.PoETModel
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.PoET2Model
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.SVDModel
   :members:
   :inherited-members:

.. autoclass:: openprotein.embeddings.UMAPModel
   :members:
   :inherited-members:

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
