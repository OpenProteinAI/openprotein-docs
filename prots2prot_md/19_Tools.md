# Tools

## Scoring sequences with prots2prot

Click “Create query” to go to the query tool. This tool allows you to score arbitrary sequences defined in a fasta or CSV file. It will calculate the log-likelihood of each sequence conditioned on the sequence context defined by the prompt.

![](48_query.png)

This tool is useful if you want to score, prioritize, or rank specific sequence variants of interest. For example, you could score homologous sequences mined from a database, perform a synthetic alanine scan or deletion scan, or enumerate combinatorial mutations at specific sites.

Clicking “Run” will start the job. This could take a few minutes depending on how busy the service is, how long your sequences are, and how many sequences you want to score.

![](49_prots_result.png)

The results are presented as a table, which can be sorted and downloaded. You can further explore the local fitness landscape of each sequence by using the quick links to the 'Single site analysis' page. This will run single site analysis for the specified sequence with your prompt. You can also add new sequences to the job using the “Add sequences” button.

## Single site analysis

Click “Single site analysis” to go to the single site analysis tool. This tool will score all single substitution variants of a parent sequence, conditioned on the prompt, and present the results in a heatmap.

![](50_single_site.png)

Results can be downloaded as a table using the “Export” button. The single site page will also show the highest scoring variants and sites in tables below the heatmap for quick reference. The parameters used to run the single site analysis can be found in the “Single site details” tab.

![](51_ss_heatmap.png)

Clicking on a variant in the heatmap will open the “Run new” drawer and fill in that variant to provide a quick link to run single site analysis on that variant as the parent sequence using the same prompt. You can also enter an arbitrary sequence in “Run new” to run single site analysis for other sequences without respecifying the prompt.

![](52_ss_example.png)

Single site analysis is useful if you want to understand the local fitness landscape of a protein, identify promising single substitution variants, identify hotspots for mutagenesis, and design combinatorial variant libraries.

## Generate novel sequences

Click “Generate sequences” to go to the sequence generation tool. This tool allows you to sample novel protein sequences conditioned on the sequence context provided by your prompt sequences. This tool offers a way to explore and efficiently generate functional sequences from the fitness landscape around your prompt sequences. Generate is ideal for designing high diversity, bespoke protein sequence libraries and can sample non-trivial and variable length sequences.

![](53_generate_seq.png)

The sampling behaviour can be controlled by tuning your prompt and through the sampling options provided. In particular, “temperature,” “top-p,” and “top-k” provide the ability to focus sampling around highly likely sequences by adjusting these parameters.  

Generated sequences are presented in a table similar to the Query results above.

![](54_generate_results.png)

The table can be downloaded using the “Export” button and local fitness landscapes are quickly accessible via the single site analysis buttons for each sequence.  