openprotein.molecules
=====================

These data primitives represent a unified interface to working with our platform, whether it be structure prediction, binder design or inverse folding.

Protein
^^^^^^^

:py:class:`~openprotein.molecules.Protein` is a fundamental primitive for working with proteins on the platform. These can be uploaded to our platform as a :py:class:`~openprotein.prompt.Query` to be used with models like :py:class:`~openprotein.models.ProteinMPNNModel` (e.g. for inverse-folding), as well as for ease of reuse.

.. autoclass:: openprotein.molecules.Protein
   :members:

Complex
^^^^^^^

:py:class:`~openprotein.molecules.Complex` describes a molecular complex representation. These can be uploaded to our platform as a :py:class:`~openprotein.prompt.Query` to be used with models like :py:class:`~openprotein.models.RFdiffusionModel`, (e.g. for multi-chain binder design) as well as for easy reuse.

.. autoclass:: openprotein.molecules.Complex
   :members:

Structure
^^^^^^^^^

:py:class:`~openprotein.molecules.Structure` describes a collection of :py:class:`Complex` instances. These are typically created when parsing structure files (e.g., CIF, PDB) that contain multiple models of the same molecular complex, such as NMR ensembles or computational predictions with multiple conformations.

.. autoclass:: openprotein.molecules.Structure
   :members:

Ligand
^^^^^^

:py:class:`~openprotein.molecules.Ligand` represents a ligand that can be described either by ``smiles`` or ``ccd``. These are intended to be used as part of a :py:class:`Complex`.

.. autoclass:: openprotein.molecules.Ligand
   :members:

DNA
^^^

:py:class:`~openprotein.molecules.DNA` represents a DNA chain. These are intended to be used as part of a :py:class:`Complex`.

.. autoclass:: openprotein.molecules.DNA
   :members:

RNA
^^^

:py:class:`~openprotein.molecules.RNA` represents a RNA chain. These are intended to be used as part of a :py:class:`Complex`.

.. autoclass:: openprotein.molecules.RNA
   :members:
