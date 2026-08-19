openprotein.fold
================

Create PDBs of your protein sequences via our folding models!

Note that for Boltz and AlphaFold2 Models, you will also need to utilize our :doc:`align <align>` workflow to create MSAs.

Interface 
---------

.. autoclass:: openprotein.fold.FoldAPI
   :members:
   :undoc-members:


Models 
------

.. autoclass:: openprotein.fold.ProtenixModel
   :members:

.. autoclass:: openprotein.fold.Boltz2Model
   :members:

.. autoclass:: openprotein.fold.Boltz1xModel
   :members:

.. autoclass:: openprotein.fold.Boltz1Model
   :members:

.. autoclass:: openprotein.fold.RosettaFold3Model
   :members:

.. autoclass:: openprotein.fold.AlphaFold2Model
   :members:

.. autoclass:: openprotein.fold.ESMFoldModel
   :members:

.. autoclass:: openprotein.fold.ESMFold2Model
   :members:

.. autoclass:: openprotein.fold.ESMFold2FastModel
   :members:

.. autoclass:: openprotein.fold.MiniFoldModel
   :members:

Results
-------

.. autoclass:: openprotein.fold.ESMFold2Confidence
   :members:

.. autoclass:: openprotein.fold.FoldResultFuture
   :members:
   :inherited-members:

