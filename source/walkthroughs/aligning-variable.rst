Aligning variable length sequences using Python
===============================================

This walkthrough demonstrates how to convert a dataset of unaligned sequences into a dataset of aligned sequences using a Python script. We'll utilize conda or Mamba to set up a Python environment and Multiple Alignment using Fast Fourier Transform (MAFFT) for creating multiple sequence alignments.

.. note:: You'll need to install either `conda <https://conda.io/projects/conda/en/latest/user-guide/install/index.html>`_ or `mamba <https://mamba.readthedocs.io/en/latest/installation/mamba-installation.html>`_.

   * For this walkthrough, we recommend using `conda`. If you're using mamba, replace instances of `conda` below with `mamba`.

   * Additionally, you'll require a dataset formatted as a CSV file. This guide uses angle brackets `< >` to denote where your own values should be inserted.

   * We'll use the file `example_dataset.csv`, which contains a fabricated dataset of unaligned sequences. The column containing sequences is named `sequence`, and the dataset includes three sequences along with measurements for three properties.

Creating a Conda Environment and Installing MAFFT
---------------------------------------------------

First, clone the GitHub repository:

.. code-block:: bash

   git clone https://github.com/OpenProteinAI/tool-make-aligned-dataset.git
   cd tool-make-aligned-datasets

Now, create a conda environment with the necessary dependencies.

For Linux or non-Apple Silicon Macs:

.. code-block:: bash

   conda env create -n tool-make-aligned-dataset -f environment.yml

MAFFT will be automatically installed through conda.

For Windows (non-WSL):

.. code-block:: bash

   conda env create -n tool-make-aligned-dataset -f environment-no-MAFFT.yml
   # Then install MAFFT using the instructions on the MAFFT website.

For Apple Silicon:

.. code-block:: bash

   conda env create -n tool-make-aligned-dataset -f environment-no-MAFFT.yml
   brew install MAFFT

Activating Your Environment and Aligning Your Sequences
--------------------------------------------------------

Activate the conda environment:

.. code-block:: bash

   conda activate tool-make-aligned-dataset

Run the `make_aligned_dataset.py` script on your dataset:

.. code-block:: bash

   python make_aligned_dataset.py 
       --dataset <path-to-dataset> 
       --sequence_column_name <name-of-column-with-sequences>

For our `example_dataset.csv`, the command looks like:

.. code-block:: bash

   python make_aligned_dataset.py 
        --dataset example_dataset.csv 
        --sequence_column_name sequence

The output of this script is a file with the original dataset name with `_aligned` appended to it. In our example, the new file will be named `example_dataset_aligned.csv`.

This newly aligned dataset file will be located in the same directory as the input file. It contains the same data as the original `example_dataset.csv`, but with the sequence column now containing aligned sequences.
