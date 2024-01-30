---
title: Prompt And Prompt Sampling Methods
format:
  html:
    code-fold: true
---

## What is a prompt?

A prompt is an input instructing a Generative AI model to generate the desired response. PoET uses a prompt that is a set of related sequences. They may be homologs, family members, or some other grouping that represents your protein of interest.

## Creating a prompt

The prompt can be a multiple sequence alignment (MSA) uploaded by the user, or created by the PoET model doing a homology search based on a seed sequence provided by the user.

## What is a multiple sequence alignment?

Multiple sequence alignment (MSA) is a technique for biological sequence analysis. It consists of a sequence alignment of three or more biological sequences that usually have an evolutionary relationship.

## Why is MSA useful?

The resulting MSA can be used to infer sequence homology and conduct phylogenetic analysis to assess the sequences' shared evolutionary origins. Biologically sound and accurate alignments show homology and relationships, allowing for new member identification and the comparison of similar sequences. Because subsequent analysis depends on the results of an MSA, accuracy is vital.

## If you have an existing MSA

You can input the MSA directly, or upload an existing .fa, .fasta, or .csv file. Your prompt should include sequences you want to optimize for. The model learns the patterns of the proteins and predicts sequences that best fit that list. Since the model views proteins in their entirety, you cannot optimize for a specific property or activity.

## If you do not have an existing MSA

When a user inputs a single sequence and selects **Use first sequence as a seed** , PoET does a homology search using public databases like uniprot to build an MSA from the seed sequence. PoET then creates a prompt by randomly selecting sequences from the MSA.

# Prompt sampling parameters

## Prompt sampling definitions

* _Sampling method_: defines the sampling strategy used for selecting prompt sequences from the homologs found by homology search, or from the provided MSA. The following strategies are available:
  * Top: Select sequences based on the order in which they occur in the MSA
  * Random: Select sequences randomly without replacement in the MSA
  * Neighbors: Sample more diverse, less redundant sequences from the MSA by sampling each sequence with weight inversely proportional to its number of homologs in the MSA

* _Homology level_: this parameter controls the identity level at which two sequences are considered "neighbors" - that is, redundant - in the MSA. This is equivalent to the homology level used to calculate the number of effective sequences in protein families.

* _Random seed: The seed for the random number generator used to sample from the MSA. Using the same seed with the same MSA and sampling parameters will guarantee that the same results are generated each time. Different seeds will produce different prompt samples.

* _Maximum similarity_: the maximum similarity to the seed sequence allowed when selecting sequences for the prompt. No sequence with identity greater than this to the seed will be included.

* _Minimum similarity_: the minimum similarity to the seed sequence allowed when selecting sequences for the prompt. No sequence with identity less than this to the seed will be included. This is useful for creating prompts that are highly focused on the local sequence space around the seed.

* _Maximum number of sequences:_ The number of sequences sampled from the MSA to form the prompt. The same sequence will not be sampled from the MSA more than once, so the number of sequences in the prompt will never be greater than the number of sequences in the MSA.

* _Maximum total number of residues:_ The maximum total number of residues in all sequences sampled from the MSA to form the prompt. For example, if this is set to 1000, sequences will be sampled from the MSA up to a maximum cumulative length of 1000 residues.

## Prompt sampling explained

The selection of prompt sequences from the MSA is controlled by several prompt sampling parameters.

The **sampling method** field defines the sampling strategy used for selecting prompt sequences from the homologs found by homology search, or from the provided MSA. We recommend using the default "Neighbors" method.

The **homology level** field allows you to generate more or less diverse prompt sequences.

If your protein comes from a highly diverse family or you wish to explore a large and diverse set of variants, adjusting the homology level to be lower will select higher diversity prompt sequences and thus generate higher diversity sequence distributions.

If you wish to have more focused generation, then using a higher homology level and setting a minimum similarity threshold can help to ensure that the prompt focuses on the local sequence landscape around your seed.

The **maximum** and **minimum similarity parameters** are set to reasonable values by default, which perform well across a wide range of protein families. These can be tuned, however, to control the diversity of sequences that will be modeled by PoET. We suggest starting with the default settings, then adjusting to maximum similarity of 0.95 and a minimum similarity of 0.2.