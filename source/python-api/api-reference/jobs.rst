openprotein.jobs
================

Retrieve and monitor your jobs on our platform.

Interface
---------

.. autoclass:: openprotein.jobs.JobsAPI
   :members:

Classes
-------

.. autoclass:: openprotein.jobs.Job
   :members:
   :exclude-members: model_config

.. autoclass:: openprotein.jobs.Future
   :members: wait, wait_until_done, get

