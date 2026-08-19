Quickstart
==========

All interactions with OpenProtein are performed through a
:py:class:`~openprotein.OpenProtein` ``session``. A session encapsulates
authentication and provides access to all available APIs and workflows.

.. _authentication:

Creating a session
------------------

To create a session, you must authenticate using your OpenProtein credentials.
The :py:func:`connect` function resolves credentials using the following order of precedence:

1. Explicit arguments passed to :py:func:`connect`
2. Environment variables
3. A configuration file at ``~/.openprotein/config.toml``

**1. Explicit credentials**

.. code-block:: python

    import openprotein

    session = openprotein.connect(
        username="username",
        password="password",
    )

**2. Environment variables**

Set the following variables in your shell (or via ``%env`` in Jupyter):

- ``OPENPROTEIN_USERNAME``
- ``OPENPROTEIN_PASSWORD``

.. code-block:: python

    session = openprotein.connect()

**3. Configuration file**

Create ~/.openprotein/config.toml with the following contents:

.. code-block:: toml

    username = "username"
    password = "password"

Then simply call:

.. code-block:: python

    session = openprotein.connect()

.. note::

    For security and reproducibility, we recommend using environment variables
    or a configuration file rather than embedding credentials directly in code.

Using the session
-----------------

Once connected, the session provides access to all OpenProtein APIs.

For example, to upload a dataset:

For example, upload your dataset with

.. code-block:: python

    session.data.create(...)

or create an MSA using homology search with

.. code-block:: python

    session.align.create_msa(...)


.. _jobs-system:

Job System
----------

The OpenProtein.AI platform operates with an asynchronous framework. When initiating a task using our Python client, the system schedules the job, returning a prompt response with a unique Job ID. This mechanism ensures that tasks requiring longer processing times do not necessitate immediate waiting. 

When you submit a task, such as using the method

.. code-block:: python

    session.align.create_msa(...)

a :py:class:`~openprotein.jobs.Future` object is returned for results
tracking and access. You can check a job's status using the
:py:meth:`~openprotein.jobs.Future.refresh` and
:py:meth:`~openprotein.jobs.Future.done` methods on this object. If
you wish to wait for the results, you can use the :py:meth:`~openprotein.jobs.Future.wait` method,
or the :py:meth:`~openprotein.jobs.Future.get` method if the results are already completed.

In addition, you can resume a workflow using the :py:meth:`session.jobs.get <openprotein.jobs.JobsAPI.get>` function along with the unique job ID obtained during task execution. This method will return a Future Class, allowing you to continue from where you left off.

For example, for a homology search workflow:

.. code-block:: python

    # 1. Create the MSA job
    msa_job = session.align.create_msa(...)

    ...

    # 2. Retrieve the MSA job
    msa_job = session.jobs.get("f989befa-5fb2-43e1-b8d0-bb070601ceec")

    # 3. Wait for completion
    msa_job.wait_until_done(
        # verbose=True, # poll for progress
        # timeout=60*60, # limit the time to wait in seconds
    )

    # 4. Retrieve results
    msa_results = msa_job.get()

    # 5. Or combine step 3 and 4 with `wait`
    msa_results = msa_job.wait()

    # 6. Or use the future directly with a sample prompt to use with PoET
    prompt_job = msa_job.sample_prompt(msa_job)
