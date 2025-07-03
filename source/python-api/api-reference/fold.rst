openprotein.fold
================

Create PDBs of your protein sequences via our folding models!

Note that for AlphaFold2 Models, you will also need to utilize our :doc:`align <align>`. workflow.

Endpoints
-----------
.. autoclass:: openprotein.fold.FoldAPI
   :members:
   :undoc-members:

Models 
------

.. autoclass:: openprotein.fold.ESMFoldModel
   :members:
   :undoc-members:
   :inherited-members:

.. autoclass:: openprotein.fold.AlphaFold2Model
   :members:
   :inherited-members:


Results
-------

.. autoclass:: openprotein.fold.FoldResultFuture
   :members:
   :inherited-members:

