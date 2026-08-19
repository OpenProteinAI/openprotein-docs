openprotein.prompt
==================

Create prompts to be used with `PoET <embedding.rst#openprotein.embeddings.PoETModel>`_ models, along with queries which opens up use-cases like `inverse folding <../../walkthroughs/PoET-2_inverse_folding.ipynb>`_ with `PoET-2 <embedding.rst#openprotein.embeddings.PoET2Model>`_. 

Interface 
---------

.. autoclass:: openprotein.prompt.PromptAPI
   :members:
   :inherited-members:

Classes 
-------

.. autoclass:: openprotein.prompt.Prompt
   :members:
   :inherited-members:

.. autoclass:: openprotein.prompt.Query
   :members:
   :inherited-members:

.. autoclass:: openprotein.prompt.PromptMetadata
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.prompt.QueryMetadata
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.prompt.PromptJob
   :members:
   :exclude-members: model_config
