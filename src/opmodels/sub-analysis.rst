Substitution Analysis with OP Models
=====================================

## About Substitution Analysis

This tutorial teaches you how to use OpenProtein.AI’s OP Model’s Substitution Analysis tool to evaluate all single substitution variants of a given sequence. Use this as a starting point to design single mutant or combinatorial variant libraries, and predict the strength of protein activity.

## What You Need Before Starting

This tool requires experimental data. If you don’t yet have experimental data, use `PoET’s Substitution Analysis <../poet/substitution-analysis.md>`__ tool. For help with uploading your data, see `Uploading Your Data <./uploading-your-data.md>`__.
Visit `OP Models Scoring and Log-likelihood <./scoring-log-likelihood.md>`__ to learn about the scoring system. You will also need a model that has been trained on this dataset. Read about `Model Training and Evaluation <./model-train-evaluate.md>`__ for information on training your model.

If you run into any challenges or have questions while getting started, please contact `OpenProtein.AI support <https://www.openprotein.ai/contact>`__.

## Score Single Substitution Variants

Access this tool from your project’s **Dataset** tab. Select your starting sequence, then select **Substitution Analysis**.

.. image:: ./img/substitution-analysis/core-SA-1.png

You can also right click a sequence in the variants table and select **Run substitution analysis on this sequence**.

A new window will open, showing your input sequence. Select **Substitution Analysis** to start the job.

.. image:: ./img/substitution-analysis/core-SA-2.png

In the **Models** tab, select at least one model to run the prediction. Then select **Run**.

.. image:: ./img/substitution-analysis/core-SA-3.png

## Interpreting Your Results

Your results display a table and a heatmap. The table shows the predicted property values and standard deviations of the starting sequence.

Hover over points on the heatmap to view the log-likelihood score for each substitution variant.
The higher or less negative the log-likelihood score, the more fit the variant.

Use the heatmap to view the highest ranking sequences. The heatmap colors indicate how a mutation at that site would impact the fitness of a variant compared to the input sequence:
- Blue indicates improved fitness.
- Red indicates reduced fitness.

A site which is all white indicates that a mutation at that site would not impact fitness.
You can explore alternative design objectives by using **Show heatmap** options to adjust the scoring criteria.

You can edit the sequences in the sequence text box and select **Rerun the analysis** to find higher order variants. This process allows you to build a combinatorial library.

.. image:: ./img/substitution-analysis/core-SA-4.png

Select **Export** to download the single-site predictions as a CSV table.

## Using Your Sequences

Once you’re finished evaluating single substitution variants, use the `Structure Prediction <../structure-prediction/index.md>`__ tool to visualize and explore your sequence of interest!
