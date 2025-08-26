Session management
======================

Executing workflows is achieved with the `OpenProtein session object <api-reference/basics.rst#openprotein.OpenProtein>`_ ::
  
    # Use environment variables to store your username and password
    # If using Jupyter, you can use the %env magic command
    # %env OPENPROTEIN_USERNAME=username
    # %env OPENPROTEIN_PASSWORD=password

    session = openprotein.connect()

    # Alternatively, just provide them as arguments.
    # session = openprotein.connect(username="username", password="password")

You then have access to all the workflows: 

For example, upload your dataset with ::

    session.data.create

or create an MSA using homology search with ::

    session.align.create_msa()


Job System
----------

The OpenProtein.AI platform operates with an asynchronous framework. When initiating a task using our Python client, the system schedules the job, returning a prompt response with a unique Job ID. This mechanism ensures that tasks requiring longer processing times do not necessitate immediate waiting. 

When you submit a task, such as using the method ::

    session.align.create_msa()

a `Future <api-reference/jobs.rst#openprotein.jobs.Future>`_ object is returned for results tracking and access. You can check a job's status using the ``refresh()`` and ``done()`` methods on this object. If you wish to wait for the results, you can use the ``wait()`` method, or the ``get()`` method if the results are already completed.

In addition, you can resume a workflow using the `session.jobs.get <api-reference/jobs.rst#openprotein.jobs.JobsAPI.get>`_ function along with the unique job ID obtained during task execution. This method will return a Future Class, allowing you to continue from where you left off.

