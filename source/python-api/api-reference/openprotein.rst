openprotein
===========

This document describes the base dataclasses and primitives for working with the platform.

This includes the :py:class:`~openprotein.OpenProtein` session object, as well as primitives like the :py:class:`~openprotein.Protein` and :py:class:`~openprotein.Model` objects.

Session
-------

Create an authorized session to OpenProtein.AI backend. 

.. autofunction:: openprotein.connect

.. autoclass:: openprotein.OpenProtein
   :members:
   :class-doc-from: class
   :exclude-members: request

Data Primitives
---------------

These data primitives represent a unified interface to working with our platform, whether it be structure prediction, binder design or inverse folding.

Protein
^^^^^^^

:py:class:`~openprotein.Protein` is a fundamental primitive for working with proteins on the platform. These can be uploaded to our platform as a :py:class:`~openprotein.prompt.Query` to be used with models like :py:class:`~openprotein.models.ProteinMPNNModel` (e.g. for inverse-folding), as well as for ease of reuse.

.. autoclass:: openprotein.Protein
   :members:

Model
^^^^^

:py:class:`~openprotein.Model` describes a multimer representation. These can be uploaded to our platform as a :py:class:`~openprotein.prompt.Query` to be used with models like :py:class:`~openprotein.models.RFdiffusionModel`, (e.g. for multi-chain binder design) as well as for easy reuse.

.. autoclass:: openprotein.Model
   :members:

Ligand
^^^^^^

:py:class:`~openprotein.Ligand` represents a ligand that can be described either by ``smiles`` or ``ccd``. These are intended to be used as part of a :py:class:`Model`.

.. autoclass:: openprotein.Ligand
   :members:

DNA
^^^

:py:class:`~openprotein.DNA` represents a DNA chain. These are intended to be used as part of a :py:class:`Model`.

.. autoclass:: openprotein.DNA
   :members:

RNA
^^^

:py:class:`~openprotein.RNA` represents a RNA chain. These are intended to be used as part of a :py:class:`Model`.

.. autoclass:: openprotein.RNA
   :members:
