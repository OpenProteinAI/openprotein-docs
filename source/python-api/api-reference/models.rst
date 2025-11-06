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
.. autoclass:: openprotein.models.foundation.rfdiffusion.RFdiffusionModel
   :members:

.. autoclass:: openprotein.models.foundation.rfdiffusion.RFdiffusionFuture
   :members:
   :inherited-members:

BoltzGen
^^^^^^^^^^^
.. autoclass:: openprotein.models.foundation.boltzgen.BoltzGenModel
   :members:

.. autoclass:: openprotein.models.foundation.boltzgen.BoltzGenFuture
   :members:
   :inherited-members:
     
.. autoclass:: openprotein.models.foundation.boltzgen_schema.BoltzGenDesignSpec
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.models.foundation.boltzgen_schema.Entity
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.models.foundation.boltzgen_schema.ProteinEntity
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.models.foundation.boltzgen_schema.LigandEntity
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.models.foundation.boltzgen_schema.FileEntity
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.models.foundation.boltzgen_schema.Constraint
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.models.foundation.boltzgen_schema.BondConstraint
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.models.foundation.boltzgen_schema.TotalLengthConstraint
   :members:
   :exclude-members: model_config
