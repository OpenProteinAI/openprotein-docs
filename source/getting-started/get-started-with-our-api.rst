Getting started with OpenProtein.AI’s API
=========================================

Step 1: Request `early access <https://openprotein-ai.webflow.io/early-access-form>`_

.. dropdown:: Step 2: Install our Python client

   You can install the package via `pip <https://pypi.org/project/openprotein-python/>`_ or `conda <https://anaconda.org/openprotein/openprotein-python/files>`_ as below:

   **pip**

   .. code-block:: bash

     pip install openprotein-python

   **conda**

   .. code-block:: bash

      conda install -c openprotein openprotein-python

   **Github**

   The source code is available `here <https://github.com/OpenProteinAI/openprotein-python>`_.

    
   .. admonition:: Want to start with the web version?
      :class: tip

      Visit `Get started with no code <./get-started-with-no-code.md>`_


.. dropdown:: Step 3: Authenticate your session

   Use your username and password credentials generated at sign-up to authenticate your connection to OpenProtein.AI's backend.

   .. code-block:: python
      import openprotein

      with open('secrets.config', 'r') as f:
         config = json.load(f)

      session = openprotein.connect(username= config['username'], password= config['password'])


   **OpenProtein Job System**

   The OpenProtein.AI platform uses a job system to support asynchronous task execution.
   Upon initiating a task, the system will schedule a job with a unique Job ID so you can return
   at a later time for tasks with long processing times.

   **OpenProtein API session**

   Executing workflows is achieved with the OpenProtein APISession object (see openprotein.APISession())

   .. code-block:: bash

      session = openprotein.connect(username="username", password="password")

   You then have access to all the workflows: 
   For example

   .. code-block:: bash

      session.data.create()

   Or

   .. code-block:: bash
      
      session.poet.create_msa()


Step 4: Get started using `our API <../python-api/index.rst>`_ for your protein engineering goals

Quick start tips
----------------

Do you want to...


.. raw:: html

   <div class="row mb-3">
      <div class="col-md-2 get-started-img">
         <img src="../_static/getting-started/poet-icon.png" height="60px">
      </div>
      <div class="col-md-10">
         <b>Make sequence predictions or designs without using any data?</b><br/>
         Get started with <a href="../python-api/poet/index.html">PoET</a> which uses evolutionary information to generate protein sequences
      </div>
   </div>
   <div class="row mb-3">
      <div class="col-md-2 get-started-img">
         <img src="../_static/getting-started/bar-chart.png" height="60px">
      </div>
      <div class="col-md-10">
         <b>Analyze your experimental data for library design?</b><br/>
         Use our <a href="../python-api/property-regression-models/index.html">Property Regression Models</a> to train and deploy machine learning models in your context <br/>
         
      </div>
   </div>
   <div class="row mb-3">
      <div class="col-md-2 get-started-img">
         <img src="../_static/getting-started/dna-broken.png" height="60px">
      </div>
      <div class="col-md-10">
         <b>Explore your protein's structure?</b><br/>
         Use our <a href="../python-api/structure-prediction/index.html">Structure Prediction</a> workflow to obtain PDB files using ESMFold and AlphaFold2 models
      </div>
   </div>
   <div class="row">
      <div class="col-md-2 get-started-img">
         <img src="../_static/getting-started/embeddings.svg" height="60px">
      </div>
      <div class="col-md-10">
         <b>Obtain embeddings from protein language models?</b><br/>
         Use our <a href="../python-api/foundation-models/index.html">Foundation Models </a> to access high quality sequence embeddings using proprietary and open source models
      </div>
   </div>
