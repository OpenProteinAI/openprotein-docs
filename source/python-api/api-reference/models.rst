openprotein.models
==================

Unified access to models on the OpenProtein AI platform. Use them to work at a lower level to craft your own workflows.

Note that the Models API is a WIP interface, but we are working hard on bringing all models here for a consistent and simple developer experience.

Interface 
---------

.. autoclass:: openprotein.models.ModelsAPI
   :members:

Models 
------

RFdiffusion
^^^^^^^^^^^

RFdiffusion is diffusion model that can be used for de novo structure design and binder design. It can be used with our :py:class:`~openprotein.prompt.Query` interface to define structure prediction objectives in a unified manner. It also supports taking in the ``contigs`` defined in official RFdiffusion repo.

.. autoclass:: openprotein.models.RFdiffusionModel
   :members:

Results
"""""""

.. autoclass:: openprotein.models.RFdiffusionFuture
   :members:
   :inherited-members:

BoltzGen
^^^^^^^^

BoltzGen is a structure generation model that can be used for generating de novo structures along with nanobody scaffolds. It can be used with our :py:class:`~openprotein.prompt.Query` interface to define structure prediction objectives in a unified manner. It also supports taking in a ``design_spec`` which follows the official design specification from BoltzGen.

.. autoclass:: openprotein.models.BoltzGenModel
   :members:

Results
"""""""

.. autoclass:: openprotein.models.BoltzGenFuture
   :members:
   :inherited-members:

ProteinMPNN
^^^^^^^^^^^

ProteinMPNN is a sequence generation model that can be used for inverse folding, and is a natural next step after using structure generation models. It can be used with our :py:class:`~openprotein.prompt.Query` interface to define sequence generation objectives in a unified manner, similar to our :py:class:`~openprotein.embeddings.PoET2Model`.

.. autoclass:: openprotein.models.ProteinMPNNModel
   :members:
