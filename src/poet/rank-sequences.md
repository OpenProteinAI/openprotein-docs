---
title: Using the Rank sequences tool
format:
  html:
    code-fold: true
---

This tutorial teaches you how to assess protein fitness by using the Rank sequences tool to score your input sequences relative to a prompt. Use this as a starting point for applications like predicting the outcomes of a specific sequence or prioritizing variants for further analysis.

On this page, you will learn how to score sequences to predict fitness and rank variants, then interpret and fine-tune the results.

If you run into any challenges or have questions while getting started, please contact [OpenProtein.AI support](https://www.openprotein.ai/contact){target="_blank"}.

## What you need before starting

This tool requires a multiple sequence alignment (MSA), from which it builds a prompt. You can upload your own MSA or have the OpenProtein model generate one for you. If you aren't already familiar with prompts, we recommend learning more about OpenProtein.AI's [prompts and prompt sampling methods](./prompts.md){target="_blank"} before diving in.

You also need an input sequence, or list of sequences you want to score against the prompt.

## Rank your sequences

To navigate to the tool, open the **PoET** dropdown menu then select **Rank sequences**.

Add the sequence or sequences you want to score to the **Input sequence** field.

Enter the sequence(s) directly, or upload an existing .fa, .fasta, or .csv file.

Next, add your custom MSA to the **Prompt Definition** field **.** Enter the sequence(s) directly, or upload an existing .fa, .fasta, or .csv file.

![](./img/rank-sequences.png)

If you don't have an existing MSA, enter your target protein and select **Use first sequence as seed to generate MSA.** OpenProtein.AI generates an MSA by doing a homology search against Uniref using mmseqs2 with default settings from ColabFold. It then uses the MSA to create a prompt.

Please note that if you check **Use first sequence as seed to generate MSA** when multiple sequences are entered, sequences after the first are ignored.

Choose the number of prompts to ensemble. Select 1 to sample a single prompt, or increase the diversity of generated outputs by ensembling over 2-15 prompts. We suggest using 3-5 prompts.

Finally, set sampling method fields. We suggest starting with the default settings. If you have specific needs, see [prompt sampling parameters](./prompts.md){target="_blank"}.

You're ready to rank your sequences! Select **Run.** The job may take a few minutes depending on how busy the service is, how long your sequences are, and how many sequences you want to score.

A 400 (Bad request) error code may be due to the following:

```{=html}
<table>
  <thead>
    <tr>
      <th>Issue description</th>
      <th>Solution</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Invalid PoET Job or Parent</td>
      <td>Re-enter prompt and try again.</td>
    </tr>
    <tr>
      <td>Invalid prompt in PoET service</td>
      <td>
        Reupload prompt and try again. Refer to the article about <a href="./prompts.md">prompts</a>.<br>
        Ensure minimum and maximum similarity parameters are not filtering out all sequences in prompt.
      </td>
    </tr>
    <tr>
      <td>Invalid user input in align service </td>
      <td>
        Ensure you don’t have
        <ul>
          <li>a top_p>1</li>
          <li>a non-valid amino acid</li>
          <li>Maximum similarity < minimum similarity</li>
        </ul>
        If necessary, refer to the article on [sampling parameters](./prompts.md#prompt-sampling-definitions).

      </td>
    </tr>
    <tr>
      <td>Invalid MSA (not aligned, etc)</td>
      <td>
        - Make sure your MSAs are aligned and rebuild MSA if necessary. <br>
        - If you have uploaded pre-computed MSA , confirm that formatting is correct and sequences are of equal length (use gap tokens “-”).<br>
        - If you are building from a seed sequence, try rebuilding the MSA
        </ul>
      </td>
    </tr>
  </tbody>
</table>
```

Please contact [OpenProtein.AI support](https://www.openprotein.ai/contact){target="_blank"} if the suggested solutions don't resolve the issue.

## Interpreting your results

PoET modeling returns a log-likelihood score to evaluate the fitness of the _input sequence_ relative to the _prompt_. A positive number indicates an improvement in fitness relative to the prompt, a negative number indicates a decrease in fitness relative to the prompt, and a 0 indicates equivalent fitness to the prompt.

The results are presented as a table. You can filter or sort the table, and download it through the user interface (UI) for further analysis.

Explore the local fitness landscape of each sequence using the quick links to the **Substitution analysis** page. This will run single site analysis for the specified sequence with your prompt. You can also add new sequences to the job using the **Add sequences** button. Details of your input sequence can be found in **Query details**.

The PoET **History** page allows you to view and access past jobs, sorted by created date, job type, and status. Clicking the job ID will take you to the results page for that job.

## Fine-tuning your results

Improve your results by adding more sequences with your desired properties to your MSA, or by adjusting the **prompt sampling method**. You can also adjust the **Maximum similarity to seed sequence** and **Minimum similarity to seed sequence** fields.

To improve scores, increase the number of the **ensemble** setting. This will result in higher scoring sequences, but will take longer to complete.

## Next steps

Now that you have a list of sequence variants of interest, you can use [Structure Prediction](../structure-prediction/using-structure-prediction.md) to visualize the 3D structures of a protein sequence. You can also use [Substitution Analysis](./substitution-analysis.md) to score all single substitution variants of your parent sequence, conditioned on the prompt, and view the results in a heatmap.