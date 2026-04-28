Prompt And Prompt Sampling Methods
===================================

What is a Prompt?
-----------------

A prompt is an input that directs a generative AI model to produce the desired protein sequences. For PoET-2, a prompt can include sequences and/or structures that define the target protein subspace. In contrast, PoET-1 uses a prompt composed of a set of related sequences. These sequences can be homologs, family members, or other groupings that capture the characteristics of the protein of interest.

A PoET-2 prompt is made up of two components, either of which can be included or omitted depending on your use case.

- Context: Sequences and/or structures that guide PoET-2’s output distribution and enable in-context learning.
- Query: Specific constraints, such as sequence length, motifs, or active site residues, allowing precise control over the generated sequence.

**Note:** PoET-1 is still available for some use cases and legacy workflows, but we recommend PoET-2 for most scenarios.

Creating a Query
-----------------
A query allows you to specify precise constraints for PoET-2 to follow during sequence generation. 


Query Components
~~~~~~~~~~~~~~~~

- **Reference sequence:** Baseline sequence for comparison and edits.  
- **Query sequence:** User-defined sequence for masking sites (valid amino acids and gap tokens only).  
- **Structure:** Defines structural positions to mask (`X` for masked, `S` for unmasked).

The query enables targeted generation tasks such as sequence in-filling, inverse folding, or motif scaffolding. Only **one** sequence or structure can be entered per query.


Uploading a Query
~~~~~~~~~~~~~~~~~

You can enter into the sequence editor or upload a query in the following formats:

- **Sequence-only files (`.fasta` or `.csv`):**  
  Uploading a sequence file displays both the reference sequence and the query sequence. You can indicate masked positions in the query sequence using the `X` token. The reference sequence serves as a guide to identify positions for masking and to compare edits against the original sequence.

- **Structure files (`.pdb`):**  
  Uploading a structure file allows you to indicate masked positions in the structure track:  
  - `X` — mask this position  
  - `S` — keep the structure corresponding to the amino acid

You also have the option to skip entering a query by toggling the disable query switch.

.. image:: /_static/tools/poet/query-1.png
  :alt: Uploading query


Sequence Editor Tools
~~~~~~~~~~~~~~~~~~~~~

The sequence editor provides buttons at the top for efficient query editing:

- **Undo / Redo** — revert or restore changes  
- **Mask Sequence** — mask all positions using the `X` token  
- **Unmask Sequence** — restore all positions to match the reference sequence  
- **Mask Selected Residues** — mask only the highlighted positions  
- **Mask Unselected Residues** — mask all positions except the highlighted ones
- **Delete Undefined Structures** - delete positions with undefined structures after uploading a structure file

Additional keyboard shortcuts include:

- Copy and paste sequences  (Ctrl + C / V)
- Replace highlighted positions with a character (e.g., highlight positions 1–50 and press `X` to mask that region)
- To add a chain where sequence and structures are unknown, you can indicate with the formula `/`, `x`, `*`, followed by the number of residues in the chain. For example, to add a chain of 80 residues, you can input `/x*80` as a shortcut. 

These tools allow precise control over the query, enabling you to define exactly which residues or structural positions should guide PoET-2's generation.

.. image:: /_static/tools/poet/query-2.png
  :alt: Sequence editor tools


Creating a Context
-------------------

You can create a prompt context in three ways:

1. Use Existing Prompt
~~~~~~~~~~~~~~~~~~~~~~~

If you've previously uploaded prompts, you can reuse them. In the **Choose from project**,
select an existing prompt. The sequences from that prompt will automatically load.

.. image:: /_static/tools/poet/prompt-contenxt-use-existing-1.png
  :alt: Use existing prompt

.. image:: /_static/tools/poet/prompt-contenxt-use-existing-2.png
  :alt: Use existing prompt

2. Create Custom Context
~~~~~~~~~~~~~~~~~~~~~~~~~

To create a custom prompt context, in the **Prompt Type** dropdown, select **Create New Prompt** option, and select **Custom** option from the toggle buttons. You can add sequences to your custom context in two ways:

1. **Upload files**: Click **Choose Files** to select files for your context. We support .fa, .fasta for FASTA files, and .pdb, .cif for structure files.
2. **Manually enter sequences**: Paste sequences in CSV or FASTA format, then click **Upload**. If you use CSV content, please note the following requirements:

   - It must not include a header row.
   - It can contain a maximum of 2 columns.
   - If there are 2 columns, the first one must be the sequence names.

.. image:: /_static/tools/poet/prompt-context-custom-1.png
  :alt: Create custom context

After uploading the first prompt, a file list will appear where you can preview and manage your prompts. You can upload more prompts by dragging additional files into the list, or click **Add Files** to manually enter sequences for the selected prompt. You can also drag and drop files within the list to move them between prompts.

If a structure file contains multiple chains, you can select which chain to use for the prompt.

.. image:: /_static/tools/poet/prompt-context-custom-2.png
  :alt: Manage prompts


3. Build From MSA
~~~~~~~~~~~~~~~~~~

A multiple sequence alignment (MSA) places three or more related protein sequences in register so that equivalent residues are compared in the same positions. Protein MSAs often include gap characters (`-`) to preserve this relationship across insertions and deletions.

Use this option when you already have an MSA, want to reuse an MSA from the project, or want OpenProtein to build an MSA from a seed sequence. PoET samples sequences from the MSA according to the prompt sampling parameters and uses those sampled sequences as the prompt context.

When uploading a precomputed MSA, make sure the sequences are aligned and use gap tokens where needed. FASTA files should use `.fa` or `.fasta`; CSV files should not include a header row.

Create the Prompt Context
^^^^^^^^^^^^^^^^^^^^^^^^^

There are several ways to create a context from an MSA:

1. **Use Existing MSA**: Select an existing MSA from the current project.
2. **Upload MSA**: Upload an aligned MSA file directly.
3. **Run Homology Search Using a Seed Sequence**: Enter a single protein sequence to start a homology search. Choose a representative sequence for the protein family or design target, because OpenProtein searches for homologs from this seed, builds an MSA from the results, and samples that MSA to create the prompt context.

.. image:: /_static/tools/poet/prompt-context-msa.png
  :alt: Manage prompts

.. _prompt-sampling-definitions:

Prompt Sampling Parameters
^^^^^^^^^^^^^^^^^^^^^^^^^^^

The selection of prompt sequences from the MSA is controlled by several prompt sampling parameters.

The **sampling method** field defines the strategy used for selecting prompt sequences from the homologs found by homology search, or from the provided MSA. We recommend using the default **Neighbors** method. The other options are **Top** and **Random**.

The **homology level** field allows you to generate more or less diverse prompt sequences. If your protein comes from a highly diverse family, or if you want to explore a large and diverse set of variants, use a lower homology level. If you need more focused generation, use a higher homology level and set a minimum similarity threshold to focus the prompt on the local sequence landscape around your seed.

The default **maximum similarity** and **minimum similarity** parameters work well across a wide range of protein families. Tune these parameters when you want to adjust the diversity of sequences modeled by PoET.

- **Number of prompts to ensemble**: Choose 1 to sample a single prompt, or 2-15 to increase diversity. We recommend 3-5 prompts for most use cases.

- **Sampling method**: Defines the sampling strategy used for selecting prompt sequences from the homologs found by homology search, or from the provided MSA. The following strategies are available:

  - **Top**: Select sequences based on the order in which they occur in the MSA.
  - **Random**: Select sequences randomly without replacement in the MSA.
  - **Neighbors**: Sample more diverse, less redundant sequences from the MSA by sampling each sequence with weight inversely proportional to its number of homologs in the MSA.

- **Homology level**: This parameter controls the identity level at which two sequences are considered “neighbors” - that is, redundant - in the MSA. This is equivalent to the homology level used to calculate the number of effective sequences in protein families.
- **Random seed**: The seed for the random number generator used to sample from the MSA. Using the same seed with the same MSA and sampling parameters will guarantee that the same results are generated each time. Different seeds will produce different prompt samples.
- **Maximum similarity to seed sequence**: The maximum similarity to the seed sequence allowed when selecting sequences for the prompt. No sequence with identity greater than this to the seed will be included.
- **Minimum similarity to seed sequence**: The minimum similarity to the seed sequence allowed when selecting sequences for the prompt. No sequence with identity less than this to the seed will be included. This is useful for creating prompts that are highly focused on the local sequence space around the seed.
- **Maximum number of sequences**: The number of sequences sampled from the MSA to form the prompt. The same sequence will not be sampled from the MSA more than once, so the number of sequences in the prompt will never be greater than the number of sequences in the MSA.
- **Maximum total number of residues**: The maximum total number of residues in all sequences sampled from the MSA to form the prompt. For example, if this is set to 1000, sequences will be sampled from the MSA up to a maximum cumulative length of 1000 residues.
